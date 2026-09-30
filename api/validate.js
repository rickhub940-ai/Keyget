const redis = require("../lib/redis");

module.exports = async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST")
        return res.status(405).json({
            valid: false,
            error: "Method not allowed"
        });

    try {
        const { key, hwid } = req.body || {};

        if (
            typeof key !== "string" ||
            typeof hwid !== "string"
        ) {
            return res.status(400).json({
                valid: false,
                error: "Invalid request"
            });
        }

        const data = await redis.get(`key:${key}`);

        if (!data) {
            return res.status(403).json({
                valid: false,
                error: "Invalid or expired key"
            });
        }

        if (data.hwid !== hwid) {
            return res.status(403).json({
                valid: false,
                error: "HWID mismatch"
            });
        }

        const ttl = await redis.ttl(`key:${key}`);

        if (ttl <= 0) {
            return res.status(403).json({
                valid: false,
                error: "Expired key"
            });
        }

        return res.status(200).json({
            valid: true,
            expiresIn: ttl
        });
    } catch {
        return res.status(500).json({
            valid: false,
            error: "Verification unavailable"
        });
    }
};
