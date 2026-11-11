import Link from "next/link";
import { getUser } from "@/lib/session";
import { logout } from "@/app/actions";
import Nav from "@/components/Nav";

export default async function Header() {
  const user = await getUser();
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand"><b>№</b>Freelance Ledger</Link>
        {user ? (
          <>
            <Nav />
            <div className="who">
              <span className="who-name">{user.name}</span>
              <form action={logout}><button className="linklike">Sign out</button></form>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
