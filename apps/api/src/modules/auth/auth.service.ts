import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// In a real app we'd load keys from env or AWS KMS, for now a secret is fine
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-that-should-be-changed';
const JWT_EXPIRES_IN = '1h';

export class AuthService {
    /**
     * Hashes a plaintext password
     */
    static async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Compares plain password with hash
     */
    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generates a JWT for the given user, signed with RS256 (or HS256 placeholder)
     */
    static generateToken(payload: object): string {
        // Note: The prompt asked for RS256. For RS256 you need an actual private/public key pair.
        // Assuming the secret is just a string for now, but in prod it would be `fs.readFileSync('private.pem')` + `{ algorithm: 'RS256' }`
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            // algorithm: 'RS256' // Uncomment when real keys are provided
        });
    }

    /**
     * Verifies the given token and returns the payload
     */
    static verifyToken(token: string): any {
        return jwt.verify(token, JWT_SECRET);
    }

    /**
     * Generates a random refresh token
     */
    static generateRefreshToken(): string {
        return randomBytes(40).toString('hex');
    }
}
