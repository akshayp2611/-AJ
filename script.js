app.get("/api/youtube/search", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();

        if (!q) {
            return res.status(400).json({
                success: false,
                error: "Search query is required"
            });
        }

        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            return res.status(503).json({
                success: false,
                error: "YouTube API is not configured"
            });
        }

        const url =
            "https://www.googleapis.com/youtube/v3/search" +
            "?part=snippet" +
            "&type=video" +
            "&videoEmbeddable=true" +
            "&maxResults=12" +
            "&regionCode=IN" +
            "&q=" + encodeURIComponent(q) +
            "&key=" + encodeURIComponent(apiKey);

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data?.error?.message || "YouTube API request failed"
            });
        }

        const results = (data.items || [])
            .filter(item => item.id?.videoId)
            .map(item => ({
                id: item.id.videoId,
                title: item.snippet?.title || "YouTube Video",
                channel: item.snippet?.channelTitle || "",
                description: item.snippet?.description || "",
                thumbnail:
                    item.snippet?.thumbnails?.high?.url ||
                    item.snippet?.thumbnails?.medium?.url ||
                    item.snippet?.thumbnails?.default?.url ||
                    "",
                url:
                    "https://www.youtube.com/watch?v=" +
                    item.id.videoId
            }));

        res.json({
            success: true,
            count: results.length,
            results
        });

    } catch (error) {
        console.error("YouTube search error:", error);

        res.status(500).json({
            success: false,
            error: "YouTube search failed"
        });
    }
});