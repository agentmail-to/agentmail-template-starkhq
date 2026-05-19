import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The agentmail SDK does a dynamic import("@x402/fetch") for its optional
    // payments integration. We don't use payments here, but Turbopack still
    // tries to resolve the import at build time. Marking the package as a
    // server external defers resolution to runtime require.
    serverExternalPackages: ["agentmail"],
};

export default nextConfig;
