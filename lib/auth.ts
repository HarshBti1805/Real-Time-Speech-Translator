// lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Apple from "next-auth/providers/apple";
import DiscordProvider from "next-auth/providers/discord";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  image: string;
}

const customAdapter = {
  ...PrismaAdapter(prisma),
  async createUser(user: User) {
    // Map NextAuth user to your schema
    const userData = {
      name: user.name,
      email: user.email,
      image: user.image,
    };

    return await prisma.user.create({
      data: userData,
    });
  },
  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    // Map your schema to NextAuth expected format
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: null, // or handle this based on your logic
    };
  },
  async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: null,
    };
  },
  async updateUser(user: User) {
    const userData = {
      name: user.name,
      email: user.email,
      image: user.image,
    };

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: userData,
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      emailVerified: null,
    };
  },
};

export const authOptions = {
  adapter: customAdapter,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email / Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.hashedPassword) {
            throw new Error("Invalid credentials");
          }

          const isValid = await compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({
      session,
      token,
    }: {
      session: { user?: { id?: string } } & Record<string, unknown>;
      token: { sub?: string } & Record<string, unknown>;
    }) {
      if (token && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({
      token,
      user,
    }: {
      token: { sub?: string } & Record<string, unknown>;
      user?: { id?: string };
    }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  events: {
    async signIn({
      user,
      account,
    }: {
      user: { email?: string };
      account?: { provider?: string };
      profile?: unknown;
    }) {
      console.log(`User ${user} signed in with ${account?.provider}`);
    },
  },
  debug: process.env.NODE_ENV === "development",
} as const;
