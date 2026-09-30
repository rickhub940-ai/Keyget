const crypto = require("node:crypto");
const redis = require("../lib/redis");

const TOKEN = process.env.LINKVERTISE_ANTI_BYPASS_TOKEN;
const KEY_TTL = 24 * 60 * 60;

module.exports = async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "GET")
        return res.status(405).json({ error: "Method not allowed" });

    const hash = req.query.hash;

    if (
        typeof hash !== "string" ||
        !/^[a-f0-9]{64}$/i.test(hash)
    ) {
        return res.status(400).json({
            success: false,
            error: "Invalid hash"
        });
    }

    if (
        typeof TOKEN !== "string" ||
        !/^[a-f0-9]{64}$/i.test(TOKEN)
    ) {
        return res.status(500).json({
            success: false,
            error: "Verification is not configured"
        });
    }

    try {
        const url =
            "https://publisher.linkvertise.com/api/v1/anti_bypassing" +
            "?token=" +
            encodeURIComponent(TOKEN) +
            "&hash=" +
            encodeURIComponent(hash);

        const response = await fetch(url, {
            method: "POST"
        });

        const result = (await response.text()).trim();

        if (result !== "TRUE") {
            return res.status(403).json({
                success: false,
                error: "Linkvertise verification failed"
            });
        }

        const claim = crypto.randomBytes(32).toString("hex");

        await redis.set(
            `claim:${claim}`,
            JSON.stringify({
                verified: true
            }),
            { ex: 120 }
        );

        return res.status(200).json({
            success: true,
            claim
        });
    } catch {
        return res.status(500).json({
            success: false,
            error: "Verification unavailable"
        });
    }
};
