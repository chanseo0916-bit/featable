import { redirect } from "next/navigation";

export default function BoardPanelFallbackPage() {
  redirect("/board");
}
