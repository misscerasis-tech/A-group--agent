import { AppShell } from "@/components/app-shell";
import { demoWorkspaceContext } from "@/lib/demo-context";

type PlaceholderPageProps = {
  activePath: string;
  title: string;
  description: string;
  nextSteps: string[];
};

export async function PlaceholderPage({
  activePath,
  title,
  description,
  nextSteps,
}: PlaceholderPageProps) {
  return (
    <AppShell activePath={activePath} context={demoWorkspaceContext} returnTo={activePath}>
      <section className="page-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </section>

      <section className="panel">
        <h3>后续阶段开放</h3>
        <ol className="placeholder-steps">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
