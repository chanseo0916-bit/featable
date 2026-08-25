export type BoardBalanceChoice = "a" | "b";

export type BoardBalanceCounts = {
  a: number;
  b: number;
  total: number;
};

export type BoardBalanceGame = {
  id: string;
  gameDate: string;
  question: string;
  optionA: string;
  optionB: string;
  status: "published";
  discussionPostId: string | null;
  viewerAuthenticated: boolean;
  optionAReasons: string[];
  optionBReasons: string[];
  viewerReasonIndex: number | null;
  reasonCounts: number[];
  counts: BoardBalanceCounts;
  viewerChoice: BoardBalanceChoice | null;
};
