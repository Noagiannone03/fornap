import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  EngagementKPIs,
  InterestsAnalytics,
  SkillsData,
  AcquisitionData,
  CommunicationData,
} from '../../types/user';

const USERS_COLLECTION = 'users';

/**
 * Calcule les KPIs d'engagement
 */
export async function getEngagementKPIs(): Promise<EngagementKPIs> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    let totalExtendedProfiles = 0;
    let publicProfileConsent = 0;
    let volunteerCount = 0;
    let participationInterested = 0;
    const allSkills = new Set<string>();
    let totalSkillsCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile) {
        totalExtendedProfiles++;

        // Consentement profil public
        if (data.extendedProfile.communication?.publicProfileConsent) {
          publicProfileConsent++;
        }

        // Bénévoles
        if (data.extendedProfile.professional?.volunteerWork?.isVolunteer) {
          volunteerCount++;
        }

        // Intérêt pour la participation
        if (data.extendedProfile.engagement?.participationInterest?.interested) {
          participationInterested++;
        }

        // Compétences
        if (data.extendedProfile.professional?.skills) {
          data.extendedProfile.professional.skills.forEach((skill: string) => {
            allSkills.add(skill);
            totalSkillsCount++;
          });
        }
      }
    });

    const profileCompletionRate =
      snapshot.size > 0 ? (totalExtendedProfiles / snapshot.size) * 100 : 0;
    const publicProfileConsentRate =
      totalExtendedProfiles > 0 ? (publicProfileConsent / totalExtendedProfiles) * 100 : 0;

    return {
      totalExtendedProfiles,
      profileCompletionRate: Math.round(profileCompletionRate * 10) / 10,
      publicProfileConsentRate: Math.round(publicProfileConsentRate * 10) / 10,
      volunteerCount,
      participationInterestedCount: participationInterested,
      totalSkillsAvailable: totalSkillsCount,
      uniqueSkillsCount: allSkills.size,
    };
  } catch (error) {
    console.error('Error getting engagement KPIs:', error);
    throw error;
  }
}

/**
 * Analyse les centres d'intérêt
 */
export async function getInterestsAnalytics(): Promise<InterestsAnalytics> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const eventTypesMap = new Map<string, number>();
    const artisticDomainsMap = new Map<string, number>();
    const musicGenresMap = new Map<string, number>();
    const conferenceThemesMap = new Map<string, number>();

    let totalWithInterests = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile?.interests) {
        totalWithInterests++;
        const interests = data.extendedProfile.interests;

        // Types d'événements
        interests.eventTypes?.forEach((type: string) => {
          const count = eventTypesMap.get(type) || 0;
          eventTypesMap.set(type, count + 1);
        });

        // Domaines artistiques
        interests.artisticDomains?.forEach((domain: string) => {
          const count = artisticDomainsMap.get(domain) || 0;
          artisticDomainsMap.set(domain, count + 1);
        });

        // Genres musicaux
        interests.musicGenres?.forEach((genre: string) => {
          const count = musicGenresMap.get(genre) || 0;
          musicGenresMap.set(genre, count + 1);
        });

        // Thèmes de conférences
        interests.conferenceThemes?.forEach((theme: string) => {
          const count = conferenceThemesMap.get(theme) || 0;
          conferenceThemesMap.set(theme, count + 1);
        });
      }
    });

    // Convertir en tableaux avec pourcentages
    const convertToArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([item, count]) => ({
          type: item,
          count,
          percentage: totalWithInterests > 0 ? Math.round((count / totalWithInterests) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

    return {
      eventTypes: convertToArray(eventTypesMap),
      artisticDomains: convertToArray(artisticDomainsMap).map(item => ({ domain: item.type, count: item.count, percentage: item.percentage })),
      musicGenres: convertToArray(musicGenresMap).map(item => ({ genre: item.type, count: item.count, percentage: item.percentage })),
      conferenceThemes: convertToArray(conferenceThemesMap).map(item => ({ theme: item.type, count: item.count, percentage: item.percentage })),
    };
  } catch (error) {
    console.error('Error getting interests analytics:', error);
    throw error;
  }
}

/**
 * Analyse les compétences disponibles
 */
export async function getSkillsAnalytics(): Promise<SkillsData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const skillsMap = new Map<
      string,
      {
        totalCount: number;
        volunteersCount: number;
        members: Array<{
          userId: string;
          name: string;
          isVolunteer: boolean;
          email?: string;
        }>;
      }
    >();

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile?.professional?.skills) {
        const skills = data.extendedProfile.professional.skills;
        const isVolunteer =
          data.extendedProfile.professional.volunteerWork?.isVolunteer || false;
        const hasPublicConsent =
          data.extendedProfile.communication?.publicProfileConsent || false;

        skills.forEach((skill: string) => {
          if (!skillsMap.has(skill)) {
            skillsMap.set(skill, {
              totalCount: 0,
              volunteersCount: 0,
              members: [],
            });
          }

          const skillData = skillsMap.get(skill)!;
          skillData.totalCount++;

          if (isVolunteer) {
            skillData.volunteersCount++;
          }

          // Ajouter le membre uniquement s'il a consenti au profil public
          if (hasPublicConsent) {
            skillData.members.push({
              userId: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              isVolunteer,
              email: data.email,
            });
          }
        });
      }
    });

    // Convertir en tableau et trier
    const bySkill = Array.from(skillsMap.entries())
      .map(([skill, data]) => ({
        skill,
        totalCount: data.totalCount,
        volunteersCount: data.volunteersCount,
        members: data.members,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    return { bySkill };
  } catch (error) {
    console.error('Error getting skills analytics:', error);
    throw error;
  }
}

/**
 * Analyse les canaux d'acquisition
 */
export async function getAcquisitionChannels(): Promise<AcquisitionData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const channelsMap = new Map<string, number>();
    const suggestions: AcquisitionData['suggestions'] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile?.engagement) {
        const engagement = data.extendedProfile.engagement;

        // Canal d'acquisition
        if (engagement.howDidYouKnowUs) {
          const count = channelsMap.get(engagement.howDidYouKnowUs) || 0;
          channelsMap.set(engagement.howDidYouKnowUs, count + 1);
        }

        // Suggestions
        if (engagement.suggestions && data.createdAt) {
          suggestions.push({
            text: engagement.suggestions,
            userId: doc.id,
            date: data.createdAt, // Firestore Timestamp
          });
        }
      }
    });

    // Convertir en tableau avec pourcentages
    const totalResponses = Array.from(channelsMap.values()).reduce((sum, count) => sum + count, 0);
    const channels = Array.from(channelsMap.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Trier les suggestions par date (plus récentes en premier)
    suggestions.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });

    return { channels, suggestions };
  } catch (error) {
    console.error('Error getting acquisition channels:', error);
    throw error;
  }
}

/**
 * Analyse les préférences de communication
 */
export async function getCommunicationPreferences(): Promise<CommunicationData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const preferredContact = {
      email: 0,
      sms: 0,
      social: 0,
      app: 0,
    };

    const socialMediaPresence = {
      instagram: 0,
      facebook: 0,
      linkedin: 0,
      tiktok: 0,
      youtube: 0,
      blog: 0,
      website: 0,
    };

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile?.communication) {
        const comm = data.extendedProfile.communication;

        // Préférence de contact
        if (comm.preferredContact) {
          preferredContact[comm.preferredContact as keyof typeof preferredContact]++;
        }

        // Présence sur réseaux sociaux
        if (comm.socialMedia) {
          if (comm.socialMedia.instagram) socialMediaPresence.instagram++;
          if (comm.socialMedia.facebook) socialMediaPresence.facebook++;
          if (comm.socialMedia.linkedin) socialMediaPresence.linkedin++;
          if (comm.socialMedia.tiktok) socialMediaPresence.tiktok++;
          if (comm.socialMedia.youtube) socialMediaPresence.youtube++;
          if (comm.socialMedia.blog) socialMediaPresence.blog++;
          if (comm.socialMedia.website) socialMediaPresence.website++;
        }
      }
    });

    return {
      preferredContact,
      socialMediaPresence,
    };
  } catch (error) {
    console.error('Error getting communication preferences:', error);
    throw error;
  }
}
