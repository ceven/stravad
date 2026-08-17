import { supabase } from './lib/supabaseClient';
import type { SessionType } from './types';
import { useEffect, useState } from 'react';
import './ActivityAggregates.css';

export default function ActivityAggregates( { session }: {session: SessionType}) {
    const [aggregates, setAggregates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadActivitesAggregate(userId: string) {

        // FIXME: create and query a view instead, since EXTRACT does not work for direct inline aggregations                
        // cannot do: EXTRACT(YEAR FROM created_at)::int as year,
        const { data: activitiesAggregate, error } = await supabase
        .schema('stravad')
        .from('activities')
        .select(`
            type,
            activity_count:id.count(),
            total_distance:distance.sum(),
            avg_distance:distance.avg(),
            max_distance:distance.max()
        `)
        .eq('user_id', userId);

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

        setAggregates(sorted || []);
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
                <h2>Activity statistics</h2>
                {aggregates.length === 0 ? (
                    <p>No activities found</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Count</th>
                                <th>Total Distance</th>
                                <th>Avg Distance</th>
                                <th>Max Distance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregates.map((agg, idx) => (
                                <tr key={idx}>
                                    <td>{agg.type}</td>
                                    <td>{agg.activity_count}</td>
                                    <td>{agg.total_distance?.toFixed(2)}</td>
                                    <td>{agg.avg_distance?.toFixed(2)}</td>
                                    <td>{agg.max_distance?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}