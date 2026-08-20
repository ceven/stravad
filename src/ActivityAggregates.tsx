import { supabase } from './lib/supabaseClient';
import type { SessionType } from './types';
import { useEffect, useState } from 'react';
import { activityIcon } from './lib/activityIcons'

function formatDistanceKm(meters: number) {
  return `${(meters / 1000).toFixed(2)}`;
}


export default function ActivityAggregates( { session }: {session: SessionType}) {
    const [aggregates, setAggregates] = useState<any[]>([]);
    const [aggregateTotal, setAggregateTotal] = useState<any>({
        total_distance: 0, 
        activity_count: 0 , 
        total_elevation_gain: 0,
    });
    const [loading, setLoading] = useState(true);

    async function loadActivitesAggregate(userId: string) {

        // FIXME: create and query a view instead, since EXTRACT does not work for direct inline aggregations                
        // cannot do: EXTRACT(YEAR FROM created_at)::int as year,
        const { data: activitiesAggregate, error } = await supabase
        .schema('stravad')
        .from('activities_aggregates')
        .select(`
            year,
            type,
            activity_count:activity_count.sum(),
            total_distance:total_distance.sum(),
            total_elevation_gain:total_elevation_gain.sum()
        `)
        .eq('user_id', userId)
        .eq('year', new Date().getFullYear());

        if (error) {
            console.error('Error loading aggregates:', error);
            setLoading(false);
            return;
        }

        const sorted = [...(activitiesAggregate ?? [])].sort((a, b) => {
            if (b.activity_count !== a.activity_count) {
                return b.activity_count - a.activity_count;
            }
            return b.total_distance - a.total_distance;
        });

        const totals = (activitiesAggregate ?? []).reduce(
            (acc, item) => ({
                total_distance: acc.total_distance + item.total_distance,
                activity_count: acc.activity_count + item.activity_count,
                total_elevation_gain: acc.total_elevation_gain + item.total_elevation_gain
            }),
            { total_distance: 0, activity_count: 0 , total_elevation_gain: 0}
        );

        setAggregates(sorted || []);
        setAggregateTotal(totals)
        setLoading(false);
    }

    useEffect(() => {
        if (session?.user?.id) {
            loadActivitesAggregate(session.user.id);
        }
    }, [session?.user?.id]);

    if (loading) return <div>Loading...</div>;

    return (
        <>
            <div className="activity-aggregates">
                {aggregates.length === 0 ? (
                    <p>No activity statistics available.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Activity</th>
                                <th>Count</th>
                                <th>Total Distance (kms)</th>
                                <th>Total Elevation Gain (kms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregates.map((agg, idx) => (
                                <tr key={idx}>
                                    <td>{agg.year}</td>
                                    <td>
                                        {activityIcon(agg.type)}
                                        {agg.type}
                                    </td>                                 
                                    <td>{agg.activity_count}</td>
                                    <td>{formatDistanceKm(agg.total_distance?agg.total_distance:0)}</td>
                                    <td>{formatDistanceKm(agg.total_elevation_gain?agg.total_elevation_gain:0)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {aggregateTotal && 
                                <tr>
                                    <td>Total</td>
                                    <td></td>
                                    <td>{aggregateTotal.activity_count}</td>
                                    <td>{formatDistanceKm(aggregateTotal.total_distance)}</td>
                                    <td>{formatDistanceKm(aggregateTotal.total_elevation_gain)}</td>
                                </tr>
                            }
                        </tfoot>
                    </table>
                )}
            </div>
        </>
    );
}