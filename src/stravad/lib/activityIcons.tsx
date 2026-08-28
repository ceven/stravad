import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPersonHiking,
    faPersonRunning,
    faPersonWalking,
    faPersonBiking,
    faPersonSwimming,
    faPersonSkiing,
    faShoePrints,
    faPersonSnowboarding,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const activityIconMap: Record<string, IconDefinition> = {
    hike: faPersonHiking,
    run: faPersonRunning,
    walk: faPersonWalking,
    bike: faPersonBiking,
    ride: faPersonBiking,
    swim: faPersonSwimming,
    ski: faPersonSkiing,
    snowboard: faPersonSnowboarding,
};

export function activityIcon(activityType: string){
    var actLc = activityType.toLowerCase()
    if (actLc == 'ride') {
        actLc = 'bike';
    } else if (actLc == 'alpineski' || actLc == 'nordicski') {
        actLc = 'ski';
    }
    return (
    <span className={`activity-icon-wrapper activity-icon--${actLc}`}>
        <FontAwesomeIcon icon={activityIconMap[actLc] ?? faShoePrints} />
    </span>
    )
}