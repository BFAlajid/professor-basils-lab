import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, PlayerRow } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function calculateElo(
  rating: number,
  opponentRating: number,
  won: boolean
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  const kFactor = rating < 1200 ? 40 : rating < 1600 ? 32 : 24;
  const score = won ? 1 : 0;
  return Math.max(100, Math.round(rating + kFactor * (score - expected)));
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabaseAuth = createClient<Database>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { battleId, opponentId, won, format } = body as {
    battleId: string;
    opponentId: string;
    won: boolean;
    format?: string;
  };

  if (!battleId || !opponentId || typeof won !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (opponentId === user.id) {
    return NextResponse.json(
      { error: "Cannot battle yourself" },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  // Check for existing pending report from opponent for this battle
  const { data: existing } = await db
    .from("pending_battle_reports")
    .select("*")
    .eq("battle_id", battleId)
    .eq("reporter_id", opponentId)
    .eq("opponent_id", user.id)
    .single();

  if (!existing) {
    // No matching report yet — store this one as pending
    const { data: duplicate } = await db
      .from("pending_battle_reports")
      .select("id")
      .eq("battle_id", battleId)
      .eq("reporter_id", user.id)
      .single();

    if (duplicate) {
      return NextResponse.json(
        { error: "Already reported", status: "pending" },
        { status: 200 }
      );
    }

    await db.from("pending_battle_reports").insert({
      battle_id: battleId,
      reporter_id: user.id,
      opponent_id: opponentId,
      reporter_won: won,
      format: format ?? "OU",
    });

    return NextResponse.json({ status: "pending" });
  }

  // Both reports exist — verify they agree
  const report = existing as { reporter_won: boolean };
  const reportsAgree = won !== report.reporter_won;

  if (!reportsAgree) {
    await db
      .from("pending_battle_reports")
      .delete()
      .eq("battle_id", battleId);

    return NextResponse.json(
      { error: "Result mismatch — battle discarded", status: "discarded" },
      { status: 200 }
    );
  }

  // Results agree — determine winner and calculate ELO
  const winnerId = won ? user.id : opponentId;
  const player1Id = user.id;
  const player2Id = opponentId;

  // Fetch both players
  const { data: p1Data } = await db
    .from("players")
    .select("*")
    .eq("id", player1Id)
    .single();
  const { data: p2Data } = await db
    .from("players")
    .select("*")
    .eq("id", player2Id)
    .single();

  const p1 = p1Data as PlayerRow | null;
  const p2 = p2Data as PlayerRow | null;

  if (!p1 || !p2) {
    return NextResponse.json(
      { error: "Player not found" },
      { status: 404 }
    );
  }

  // Get active season
  const { data: seasonData } = await db
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  const seasonId = (seasonData as { id: number } | null)?.id ?? 1;

  const p1NewElo = calculateElo(p1.season_elo, p2.season_elo, won);
  const p2NewElo = calculateElo(p2.season_elo, p1.season_elo, !won);
  const p1NewAllTime = calculateElo(p1.elo_rating, p2.elo_rating, won);
  const p2NewAllTime = calculateElo(p2.elo_rating, p1.elo_rating, !won);

  // Insert battle record
  await db.from("battles").insert({
    season_id: seasonId,
    player1_id: player1Id,
    player2_id: player2Id,
    winner_id: winnerId,
    player1_elo_before: p1.season_elo,
    player2_elo_before: p2.season_elo,
    player1_elo_after: p1NewElo,
    player2_elo_after: p2NewElo,
    format: format ?? "OU",
  });

  // Update player 1 stats
  const p1Won = winnerId === player1Id;
  await db
    .from("players")
    .update({
      elo_rating: p1NewAllTime,
      season_elo: p1NewElo,
      total_wins: p1.total_wins + (p1Won ? 1 : 0),
      total_losses: p1.total_losses + (p1Won ? 0 : 1),
      current_streak: p1Won ? p1.current_streak + 1 : 0,
      best_streak: p1Won
        ? Math.max(p1.best_streak, p1.current_streak + 1)
        : p1.best_streak,
    })
    .eq("id", player1Id);

  // Update player 2 stats
  const p2Won = winnerId === player2Id;
  await db
    .from("players")
    .update({
      elo_rating: p2NewAllTime,
      season_elo: p2NewElo,
      total_wins: p2.total_wins + (p2Won ? 1 : 0),
      total_losses: p2.total_losses + (p2Won ? 0 : 1),
      current_streak: p2Won ? p2.current_streak + 1 : 0,
      best_streak: p2Won
        ? Math.max(p2.best_streak, p2.current_streak + 1)
        : p2.best_streak,
    })
    .eq("id", player2Id);

  // Clean up pending reports
  await db
    .from("pending_battle_reports")
    .delete()
    .eq("battle_id", battleId);

  return NextResponse.json({
    status: "recorded",
    battle: {
      winnerId,
      player1: { id: player1Id, eloBefore: p1.season_elo, eloAfter: p1NewElo },
      player2: { id: player2Id, eloBefore: p2.season_elo, eloAfter: p2NewElo },
    },
  });
}
