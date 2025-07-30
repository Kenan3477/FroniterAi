"""
T3 Stack Generator (Next.js + TypeScript + tRPC + Prisma)

Generates complete, type-safe full-stack applications using the T3 stack
with end-to-end type safety and modern development practices.
"""

import json
from typing import Dict, List, Any
from ..web_development import ProjectRequirements, DatabaseType

class T3StackGenerator:
    """
    T3 Stack generator that creates:
    - Next.js 14 with App Router
    - TypeScript throughout
    - tRPC for type-safe APIs
    - Prisma for database ORM
    - NextAuth.js for authentication
    - Tailwind CSS for styling
    - End-to-end type safety
    """
    
    def __init__(self):
        self.prisma_generators = PrismaGenerators()
        self.trpc_generators = TRPCGenerators()
        self.auth_generators = AuthGenerators()
    
    async def generate_project_files(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate complete T3 stack project"""
        files = {}
        
        # Core configuration
        files.update(await self._generate_core_configs(requirements))
        
        # Database schema and setup
        files.update(await self._generate_database_setup(requirements))
        
        # tRPC setup
        files.update(await self._generate_trpc_setup(requirements))
        
        # Authentication setup
        if requirements.authentication:
            files.update(await self._generate_auth_setup(requirements))
        
        # App structure
        files.update(await self._generate_app_structure(requirements))
        
        # Components
        files.update(await self._generate_components(requirements))
        
        # Utilities
        files.update(await self._generate_utilities(requirements))
        
        # Environment configuration
        files.update(await self._generate_env_config(requirements))
        
        return files
    
    async def _generate_core_configs(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate core configuration files"""
        files = {}
        
        # Package.json with T3 dependencies
        files["package.json"] = self._generate_package_json(requirements)
        
        # Next.js config
        files["next.config.mjs"] = self._generate_next_config(requirements)
        
        # TypeScript config
        files["tsconfig.json"] = self._generate_tsconfig()
        
        # Tailwind config
        files["tailwind.config.ts"] = self._generate_tailwind_config()
        
        # PostCSS config
        files["postcss.config.cjs"] = self._generate_postcss_config()
        
        return files
    
    async def _generate_database_setup(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate Prisma database setup"""
        files = {}
        
        # Prisma schema
        files["prisma/schema.prisma"] = self.prisma_generators.generate_schema(requirements)
        
        # Database seed
        files["prisma/seed.ts"] = self.prisma_generators.generate_seed(requirements)
        
        return files
    
    async def _generate_trpc_setup(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate tRPC setup and routers"""
        files = {}
        
        # tRPC server setup
        files["src/server/api/trpc.ts"] = self.trpc_generators.generate_trpc_setup()
        
        # Root router
        files["src/server/api/root.ts"] = self.trpc_generators.generate_root_router(requirements)
        
        # Example router
        files["src/server/api/routers/example.ts"] = self.trpc_generators.generate_example_router()
        
        # Client-side tRPC setup
        files["src/utils/api.ts"] = self.trpc_generators.generate_client_setup()
        
        # tRPC React provider
        files["src/components/providers/trpc-provider.tsx"] = self.trpc_generators.generate_trpc_provider()
        
        # Feature-specific routers
        if requirements.authentication:
            files["src/server/api/routers/auth.ts"] = self.trpc_generators.generate_auth_router()
        
        if "blog" in requirements.features:
            files["src/server/api/routers/posts.ts"] = self.trpc_generators.generate_posts_router()
        
        if "ecommerce" in requirements.features:
            files["src/server/api/routers/products.ts"] = self.trpc_generators.generate_products_router()
        
        return files
    
    async def _generate_auth_setup(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate NextAuth.js setup"""
        files = {}
        
        # NextAuth configuration
        files["src/server/auth.ts"] = self.auth_generators.generate_auth_config(requirements)
        
        # Auth API route
        files["src/app/api/auth/[...nextauth]/route.ts"] = self.auth_generators.generate_auth_route()
        
        # Auth middleware
        files["src/middleware.ts"] = self.auth_generators.generate_middleware()
        
        # Auth components
        files["src/components/auth/sign-in.tsx"] = self.auth_generators.generate_signin_component()
        files["src/components/auth/sign-out.tsx"] = self.auth_generators.generate_signout_component()
        files["src/components/auth/user-avatar.tsx"] = self.auth_generators.generate_user_avatar()
        
        return files
    
    async def _generate_app_structure(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate App Router structure"""
        files = {}
        
        # Root layout
        files["src/app/layout.tsx"] = self._generate_root_layout(requirements)
        
        # Home page
        files["src/app/page.tsx"] = self._generate_home_page(requirements)
        
        # Global styles
        files["src/app/globals.css"] = self._generate_global_styles()
        
        # Loading and error pages
        files["src/app/loading.tsx"] = self._generate_loading_page()
        files["src/app/error.tsx"] = self._generate_error_page()
        
        # Feature pages
        if requirements.authentication:
            files["src/app/dashboard/page.tsx"] = self._generate_dashboard_page()
            files["src/app/profile/page.tsx"] = self._generate_profile_page()
        
        return files
    
    async def _generate_components(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate reusable components"""
        files = {}
        
        # Providers
        files["src/components/providers/index.tsx"] = self._generate_providers(requirements)
        
        # UI components
        files["src/components/ui/button.tsx"] = self._generate_button_component()
        files["src/components/ui/input.tsx"] = self._generate_input_component()
        files["src/components/ui/card.tsx"] = self._generate_card_component()
        
        # Layout components
        files["src/components/layout/navbar.tsx"] = self._generate_navbar_component(requirements)
        files["src/components/layout/footer.tsx"] = self._generate_footer_component()
        
        return files
    
    async def _generate_utilities(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate utility functions"""
        files = {}
        
        files["src/lib/utils.ts"] = self._generate_utils()
        files["src/lib/validations.ts"] = self._generate_validations()
        files["src/env.mjs"] = self._generate_env_validation()
        
        return files
    
    async def _generate_env_config(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate environment configuration"""
        files = {}
        
        files[".env.example"] = self._generate_env_example(requirements)
        
        return files
    
    def _generate_package_json(self, requirements: ProjectRequirements) -> str:
        """Generate package.json for T3 stack"""
        dependencies = {
            "@auth/prisma-adapter": "^1.0.9",
            "@prisma/client": "^5.7.1",
            "@t3-oss/env-nextjs": "^0.7.1",
            "@tanstack/react-query": "^4.36.1",
            "@trpc/client": "^10.45.0",
            "@trpc/next": "^10.45.0",
            "@trpc/react-query": "^10.45.0",
            "@trpc/server": "^10.45.0",
            "next": "^14.0.4",
            "next-auth": "^4.24.5",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "superjson": "^2.2.1",
            "zod": "^3.22.4"
        }
        
        dev_dependencies = {
            "@types/eslint": "^8.44.7",
            "@types/node": "^18.17.0",
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@typescript-eslint/eslint-plugin": "^6.11.0",
            "@typescript-eslint/parser": "^6.11.0",
            "autoprefixer": "^10.4.14",
            "eslint": "^8.54.0",
            "eslint-config-next": "^14.0.4",
            "postcss": "^8.4.31",
            "prettier": "^3.1.0",
            "prettier-plugin-tailwindcss": "^0.5.7",
            "prisma": "^5.7.1",
            "tailwindcss": "^3.3.5",
            "typescript": "^5.1.6"
        }
        
        # Add database-specific dependencies
        if requirements.database == DatabaseType.POSTGRESQL:
            dependencies["pg"] = "^8.11.3"
            dev_dependencies["@types/pg"] = "^8.10.9"
        elif requirements.database == DatabaseType.MYSQL:
            dependencies["mysql2"] = "^3.6.5"
        
        scripts = {
            "build": "next build",
            "db:generate": "prisma generate",
            "db:migrate": "prisma migrate dev",
            "db:push": "prisma db push",
            "db:studio": "prisma studio",
            "dev": "next dev",
            "postinstall": "prisma generate",
            "lint": "next lint",
            "start": "next start",
            "type-check": "tsc --noEmit"
        }
        
        package = {
            "name": requirements.name.lower().replace(" ", "-"),
            "version": "0.1.0",
            "private": True,
            "type": "module",
            "scripts": scripts,
            "dependencies": dependencies,
            "devDependencies": dev_dependencies,
            "ct3aMetadata": {
                "initVersion": "7.25.2"
            },
            "packageManager": "npm@10.2.3"
        }
        
        return json.dumps(package, indent=2)
    
    def _generate_next_config(self, requirements: ProjectRequirements) -> str:
        """Generate Next.js configuration"""
        return '''/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /**
   * If you are using `appDir: true`, you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["geist"],
};

export default config;'''
    
    def _generate_tsconfig(self) -> str:
        """Generate TypeScript configuration"""
        return '''{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    ".eslintrc.cjs",
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.cjs",
    "**/*.mjs",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}'''
    
    def _generate_root_layout(self, requirements: ProjectRequirements) -> str:
        """Generate root layout"""
        return f'''import "@/app/globals.css";

import {{ GeistSans }} from "geist/font/sans";
import {{ type Metadata }} from "next";

import {{ TRPCReactProvider }} from "@/components/providers/trpc-provider";

export const metadata: Metadata = {{
  title: "{requirements.name}",
  description: "{requirements.description}",
  icons: [{{ rel: "icon", url: "/favicon.ico" }}],
}};

export default function RootLayout({{
  children,
}}: {{
  children: React.ReactNode;
}}) {{
  return (
    <html lang="en" className={{GeistSans.variable}}>
      <body>
        <TRPCReactProvider>
          {{children}}
        </TRPCReactProvider>
      </body>
    </html>
  );
}}'''


# Helper classes for generating specific parts
class PrismaGenerators:
    def generate_schema(self, requirements: ProjectRequirements) -> str:
        """Generate Prisma schema"""
        database_url = "DATABASE_URL"
        provider = "postgresql"
        
        if requirements.database == DatabaseType.MYSQL:
            provider = "mysql"
        elif requirements.database == DatabaseType.SQLITE:
            provider = "sqlite"
            database_url = "file:./dev.db"
        
        schema = f'''// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {{
  provider = "prisma-client-js"
}}

datasource db {{
  provider = "{provider}"
  url      = env("{database_url}")
}}
'''
        
        # Add User model if authentication is enabled
        if requirements.authentication:
            schema += '''
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  posts         Post[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
'''
        
        # Add blog models if blog feature is enabled
        if "blog" in requirements.features:
            schema += '''
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}
'''
        
        return schema
    
    def generate_seed(self, requirements: ProjectRequirements) -> str:
        """Generate database seed file"""
        return '''import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Add your seed data here
  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });'''


class TRPCGenerators:
    def generate_trpc_setup(self) -> str:
        """Generate tRPC setup"""
        return '''import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";

import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";

type CreateContextOptions = {
  session: Session | null;
};

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  const session = await getServerAuthSession({ req, res });
  return createInnerTRPCContext({
    session,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);'''
    
    def generate_root_router(self, requirements: ProjectRequirements) -> str:
        """Generate root tRPC router"""
        routers = ["exampleRouter"]
        
        if requirements.authentication:
            routers.append("authRouter")
        if "blog" in requirements.features:
            routers.append("postRouter")
        
        imports = ["import { exampleRouter } from '@/server/api/routers/example';"]
        
        if requirements.authentication:
            imports.append("import { authRouter } from '@/server/api/routers/auth';")
        if "blog" in requirements.features:
            imports.append("import { postRouter } from '@/server/api/routers/posts';")
        
        router_config = {}
        for router in routers:
            key = router.replace("Router", "")
            router_config[key] = router
        
        return f'''{chr(10).join(imports)}
import {{ createTRPCRouter }} from "@/server/api/trpc";

export const appRouter = createTRPCRouter({{
{chr(10).join([f'  {key}: {value},' for key, value in router_config.items()])}
}});

export type AppRouter = typeof appRouter;'''
    
    def generate_example_router(self) -> str:
        """Generate example router"""
        return '''import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});'''
    
    def generate_client_setup(self) -> str:
        """Generate client-side tRPC setup"""
        return '''import { type AppRouter } from "@/server/api/root";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();'''
    
    def generate_trpc_provider(self) -> str:
        """Generate tRPC React provider"""
        return '''"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";

import { type AppRouter } from "@/server/api/root";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          url: getBaseUrl() + "/api/trpc",
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}'''


class AuthGenerators:
    def generate_auth_config(self, requirements: ProjectRequirements) -> str:
        """Generate NextAuth.js configuration"""
        return '''import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

import { env } from "@/env.mjs";
import { db } from "@/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
};

export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};'''
