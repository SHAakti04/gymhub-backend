declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        gymId: string | null;
        memberId: string | null;
        roles: string[];
        primaryRole: string;
      };
    }
  }
}

export {};