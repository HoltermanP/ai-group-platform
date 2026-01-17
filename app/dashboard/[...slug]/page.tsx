// Prevent static generation for this page


// Catch-all route voor dashboard pagina's om static generation te voorkomen
export const dynamic = 'force-dynamic';

// Prevent static generation for this page

export default function DashboardCatchAll() {
  return null; // Deze pagina wordt nooit bereikt omdat specifieke routes voorrang hebben
}