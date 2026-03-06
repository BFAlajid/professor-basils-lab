import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, PlayerRow } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "season";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 100);

  const supabase = createClient<Database>(supabaseUrl, anonKey);

  const eloColumn = mode === "alltime" ? "elo_rating" : "season_elo";

  const { data, error } = await supabase
    .from("players")
    .select("id, display_name, avatar_sprite, elo_rating, season_elo, total_wins, total_losses, current_streak, best_streak")
    .order(eloColumn, { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PlayerRow[];
  const leaderboard = rows.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    displayName: p.display_name,
    avatarSprite: p.avatar_sprite,
    elo: mode === "alltime" ? p.elo_rating : p.season_elo,
    allTimeElo: p.elo_rating,
    seasonElo: p.season_elo,
    wins: p.total_wins,
    losses: p.total_losses,
    streak: p.current_streak,
    bestStreak: p.best_streak,
  }));

  return NextResponse.json(
    { leaderboard, mode },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
