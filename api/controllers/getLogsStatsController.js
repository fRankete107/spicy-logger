const LogEntry = require('../../models/LogEntry');

async function getLogsStatsController(req, res) {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = {};

        if (startDate || endDate) {
            matchStage.timestamp = {};

            if (startDate) {
                const start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid startDate format. Use ISO 8601 format'
                    });
                }
                matchStage.timestamp.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid endDate format. Use ISO 8601 format'
                    });
                }
                matchStage.timestamp.$lte = end;
            }
        }

        const pipeline = [
            ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
            {
                $facet: {
                    totalCount: [
                        { $count: 'total' }
                    ],
                    byService: [
                        {
                            $group: {
                                _id: '$service',
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $sort: { count: -1 }
                        },
                        {
                            $project: {
                                _id: 0,
                                service: '$_id',
                                count: 1
                            }
                        }
                    ],
                    byLevel: [
                        {
                            $group: {
                                _id: '$level',
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                level: '$_id',
                                count: 1
                            }
                        }
                    ],
                    byServiceAndLevel: [
                        {
                            $group: {
                                _id: {
                                    service: '$service',
                                    level: '$level'
                                },
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $sort: { count: -1 }
                        },
                        {
                            $project: {
                                _id: 0,
                                service: '$_id.service',
                                level: '$_id.level',
                                count: 1
                            }
                        }
                    ]
                }
            }
        ];

        const results = await LogEntry.aggregate(pipeline);
        const facetResults = results[0];

        const totalLogs = facetResults.totalCount[0]?.total || 0;

        const byLevelMap = {};
        facetResults.byLevel.forEach(item => {
            byLevelMap[item.level] = item.count;
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalLogs,
                byService: facetResults.byService,
                byLevel: {
                    info: byLevelMap.info || 0,
                    warn: byLevelMap.warn || 0,
                    error: byLevelMap.error || 0,
                    debug: byLevelMap.debug || 0
                },
                byServiceAndLevel: facetResults.byServiceAndLevel
            }
        });

    } catch (error) {
        console.error('Error fetching log statistics:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while fetching statistics'
        });
    }
}

module.exports = getLogsStatsController;
