import { redirect } from "next/navigation";

export default function EventSubmissionRedirectPage() {
  redirect("/my/partner/register?type=event");
}
