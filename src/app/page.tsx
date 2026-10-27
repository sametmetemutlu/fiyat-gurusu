import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { GAME_PATH } from "@/lib/paths";

const projects = [
  {
    href: GAME_PATH,
    title: "Piyasa Gurusu",
    description: "İlan fiyatını tahmin et.",
    mark: "logo" as const,
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-6 py-16">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-12">
        <header className="space-y-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">sametmetemutlu</h1>
          <p className="text-muted">Üzerinde çalıştığım işler.</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted">Projeler</h2>
          <ul className="flex flex-col gap-3">
            {projects.map((project) => (
              <li key={project.href}>
                <Link
                  href={project.href}
                  className="fg-card flex items-center gap-4 px-5 py-4 transition hover:-translate-y-0.5"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center">
                    {project.mark === "logo" ? <LogoMark size={44} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-bold">{project.title}</span>
                    <span className="block text-sm text-muted">{project.description}</span>
                  </span>
                  <span className="text-xl text-muted" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
