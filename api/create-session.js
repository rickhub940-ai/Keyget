const crypto = require("node:crypto");
const redis = require("../lib/redis");

const SESSION_TTL = 10 * 60;

module.exports = async (req, res) => {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    try {
        const { hwid } = req.body || {};

        if (
            typeof hwid !== "string" ||
            hwid.length < 8 ||
            hwid.length > 256
        ) {
            return res.status(400).json({ error: "Invalid HWID" });
        }

        const session = crypto.randomBytes(32).toString("hex");

        await redis.set(
            `session:${session}`,
            JSON.stringify({
                hwid,
                verified: false
            }),
            { ex: SESSION_TTL }
        );

        return res.status(200).json({
            success: true,
            session
        });
    } catch {
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};
