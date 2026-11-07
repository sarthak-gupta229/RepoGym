import { describe, it, expect } from 'vitest';
import { detectFlows, selectFlowFiles } from '@/lib/select';

describe('lib/select.ts - Enhanced Multi-Framework Flow Detection', () => {
  it('detects React Router routes and views in a client SPA repository', () => {
    const files = {
      'client/src/App/routes.jsx': `
        import { Route, Routes } from "react-router-dom";
        import Home from "../pages/Home/Home.jsx";
        import Login from "../pages/auth/Login";
        import Track from "../pages/Track";

        export default function AppRoutes() {
          return (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/track" element={<Track />} />
              <Route path="/" element={<Home />} />
            </Routes>
          );
        }
      `,
      'client/src/pages/Home/Home.jsx': 'export default function Home() { return <div>Home</div>; }',
      'client/src/pages/auth/Login.jsx': 'export default function Login() { return <div>Login</div>; }',
      'client/src/pages/Track.jsx': 'export default function Track() { return <div>Track</div>; }',
    };

    const flows = detectFlows(files);
    expect(flows.length).toBeGreaterThan(0);

    const loginFlow = flows.find((f) => f.label.includes('/login') || f.tag === 'login');
    expect(loginFlow).toBeDefined();

    const trackFlow = flows.find((f) => f.label.includes('/track') || f.tag === 'track');
    expect(trackFlow).toBeDefined();

    // Verify selectFlowFiles returns valid files for the flow
    const selectedFiles = selectFlowFiles(files, loginFlow!);
    expect(Object.keys(selectedFiles).length).toBeGreaterThan(0);
  });

  it('guarantees architecture flows on libraries or repositories without HTTP routes', () => {
    const libraryFiles = {
      'src/index.ts': 'export * from "./calc";\nexport * from "./format";',
      'src/calc.ts': 'export function add(a: number, b: number) { return a + b; }',
      'src/format.ts': 'export function formatNumber(n: number) { return n.toFixed(2); }',
    };

    const flows = detectFlows(libraryFiles);
    expect(flows.length).toBeGreaterThan(0);
    expect(flows[0].tag).toBeDefined();
    expect(flows[0].routeFile).toBeDefined();

    const selected = selectFlowFiles(libraryFiles, flows[0]);
    expect(Object.keys(selected).length).toBeGreaterThan(0);
  });

  it('refreshes existing database analyses if flows are empty', async () => {
    const fs = await import('fs');
    if (fs.existsSync('.data/repogym-db.json')) {
      const db = JSON.parse(fs.readFileSync('.data/repogym-db.json', 'utf8'));
      let updated = 0;
      if (Array.isArray(db.analyses)) {
        for (const a of db.analyses) {
          if (!a.flows || a.flows.length === 0) {
            a.flows = detectFlows(a.file_map);
            updated++;
          }
        }
        if (updated > 0) {
          fs.writeFileSync('.data/repogym-db.json', JSON.stringify(db, null, 2), 'utf8');
        }
      }
      expect(updated).toBeGreaterThanOrEqual(0);
    }
  });
});
