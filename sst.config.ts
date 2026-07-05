/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "smflw-task",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: { aws: { region: "eu-north-1" } },
    };
  },
  async run() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_KEY must be set (see .env)");
    }
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY must be set (see .env)");
    }

    const chat = new sst.aws.Function("Chat", {
      handler: "functions/chat.handler",
      runtime: "nodejs22.x",
      timeout: "60 seconds",
      streaming: true,
      url: {
        cors: {
          allowOrigins: ["*"],
          allowMethods: ["POST"],
          allowHeaders: ["authorization", "content-type"],
        },
      },
      environment: {
        ANTHROPIC_API_KEY: anthropicKey,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_KEY: supabaseKey,
      },
    });

    const web = new sst.aws.StaticSite("Web", {
      path: "frontend",
      build: {
        command: "npm run build",
        output: "dist",
      },
      environment: {
        VITE_CHAT_URL: chat.url,
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_KEY: supabaseKey,
      },
    });

    return {
      chat: chat.url,
      web: web.url,
    };
  },
});
