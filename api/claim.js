const crypto = require("crypto");
const redis = require("../lib/redis");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { session, hwid } = req.body || {};

        if (!session || !hwid) {
            return res.status(400).json({ error: "Missing session or hwid" });
        }

        const data = await redis.get(`session:${session}`);

        if (!data) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }

        const sessionData =
            typeof data === "string" ? JSON.parse(data) : data;

        if (sessionData.verified !== true) {
            return res.status(403).json({ error: "Verification required" });
        }

        const hwidHash = crypto
            .createHash("sha256")
            .update(hwid)
            .digest("hex");

        if (sessionData.hwidHash !== hwidHash) {
            return res.status(403).json({ error: "HWID mismatch" });
        }

        const oldKey = await redis.get(`hwid:${hwidHash}`);

        if (oldKey) {
            return res.status(200).json({
                success: true,
                key: oldKey
            });
        }

        const key =
            `999MS-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

        await redis.set(`hwid:${hwidHash}`, key, {
            ex: 86400
        });

        await redis.set(
            `key:${key}`,
            JSON.stringify({
                hwidHash,
                expiresAt: Date.now() + 86400000
            }),
            {
                ex: 86400
            }
        );

        return res.status(200).json({
            success: true,
            key,
            expiresIn: 86400
        });

    } catch (err) {
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};
