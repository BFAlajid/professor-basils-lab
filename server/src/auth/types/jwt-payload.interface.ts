export interface JwtPayload {
  sub: string;       // user.id
  sessionId: string; // Session.id — used for targeted revocation on logout
  iat?: number;
  exp?: number;
  iss?: string;
}
