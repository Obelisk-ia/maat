# Maat

Maat is a digital loyalty app built with Next.js and Convex.

## Local development

```bash
pnpm install
pnpm exec convex dev
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Convex sets `NEXT_PUBLIC_CONVEX_URL` when linking the project. New Convex deployments also need `JWT_PRIVATE_KEY` and `JWKS` configured using the [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual). The app uses the Convex Auth password provider for email-and-password sign-in.

- Owners create a business during signup. Their account page shows a staff invite code they can copy or rotate.
- Staff enter the invite code at signup to join that business.
- Clients enter a phone number first and sign in with email and password. A 10-digit local number is stored with the Mexican `+52` prefix.

The business landing is at `/` and the client landing and access form are at `/clientes`. Sign-in stays active on the device for up to 30 days for all roles, until the session expires or the user signs out.
