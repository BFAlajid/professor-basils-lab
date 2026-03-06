export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          display_name: string;
          avatar_sprite: number;
          elo_rating: number;
          season_elo: number;
          total_wins: number;
          total_losses: number;
          current_streak: number;
          best_streak: number;
          season_id: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_sprite?: number;
          elo_rating?: number;
          season_elo?: number;
          total_wins?: number;
          total_losses?: number;
          current_streak?: number;
          best_streak?: number;
          season_id?: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          display_name?: string;
          avatar_sprite?: number;
          elo_rating?: number;
          season_elo?: number;
          total_wins?: number;
          total_losses?: number;
          current_streak?: number;
          best_streak?: number;
          season_id?: number;
        };
        Relationships: [];
      };
      battles: {
        Row: {
          id: string;
          season_id: number;
          player1_id: string;
          player2_id: string;
          winner_id: string;
          player1_elo_before: number;
          player2_elo_before: number;
          player1_elo_after: number;
          player2_elo_after: number;
          format: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: number;
          player1_id: string;
          player2_id: string;
          winner_id: string;
          player1_elo_before: number;
          player2_elo_before: number;
          player1_elo_after: number;
          player2_elo_after: number;
          format?: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          season_id?: number;
          player1_id?: string;
          player2_id?: string;
          winner_id?: string;
          player1_elo_before?: number;
          player2_elo_before?: number;
          player1_elo_after?: number;
          player2_elo_after?: number;
          format?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: number;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
        };
        Insert: {
          name: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      season_rankings: {
        Row: {
          id: string;
          season_id: number;
          player_id: string;
          final_elo: number;
          final_rank: number;
          wins: number;
          losses: number;
        };
        Insert: {
          id?: string;
          season_id: number;
          player_id: string;
          final_elo: number;
          final_rank: number;
          wins: number;
          losses: number;
        };
        Update: {
          id?: never;
          season_id?: number;
          player_id?: string;
          final_elo?: number;
          final_rank?: number;
          wins?: number;
          losses?: number;
        };
        Relationships: [];
      };
      pending_battle_reports: {
        Row: {
          id: string;
          battle_id: string;
          reporter_id: string;
          opponent_id: string;
          reporter_won: boolean;
          format: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          reporter_id: string;
          opponent_id: string;
          reporter_won: boolean;
          format?: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          battle_id?: string;
          reporter_id?: string;
          opponent_id?: string;
          reporter_won?: boolean;
          format?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type BattleRow = Database["public"]["Tables"]["battles"]["Row"];
export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
