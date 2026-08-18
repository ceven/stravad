import { supabase } from './lib/supabaseClient';
import type { SessionType } from './types';
import { useEffect, useState } from 'react';
import './styles.css';

export default function ActivityAggregates( { session }: {session: SessionType}) {
    const [aggregates, setAggregates] = useState<any[]>([]);
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
                {aggregates.length === 0 ? (
                    <p>No activity statistics available.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Type</th>
                                <th>Count</th>
                                <th>Total Distance (kms)</th>
                                <th>Total Elevation Gain (kms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregates.map((agg, idx) => (
                                <tr key={idx}>
                                    <td>{agg.year}</td>
                                    <td>{agg.type}</td>
                                    <td>{agg.activity_count}</td>
                                    <td>{agg.total_distance?.toFixed(2)/1000}</td>
                                    <td>{agg.total_elevation_gain?.toFixed(2)/1000}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}