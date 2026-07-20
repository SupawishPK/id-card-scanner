import { IdCardScanner } from "@/components/id-card-scanner";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-950 sm:grid sm:place-items-center sm:p-6">
      <IdCardScanner />
    </main>
  );
}
