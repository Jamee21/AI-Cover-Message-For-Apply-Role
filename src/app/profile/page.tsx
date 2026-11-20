import { redirect } from "next/navigation";

/** Legacy URL: applicants now provide a resume for each application. */
export default function ProfilePage(): never {
  redirect("/");
}
