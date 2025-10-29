import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import type { BasicSignupFormData, ExtendedSignupFormData, User as UserType } from '../types/user';
import { createUser, getUserById, updateUser, periodToMembershipType } from '../services/userService';
import { getMembershipPlanById } from '../services/membershipService';

// Type guard pour vérifier si c'est un formulaire étendu
function isExtendedSignup(data: BasicSignupFormData | ExtendedSignupFormData): data is ExtendedSignupFormData {
  return 'profession' in data;
}

// Helper pour obtenir l'IP du client (approximatif côté client)
function getClientIP(): string {
  // Côté client, on ne peut pas obtenir la vraie IP
  // En production, cela devrait être fait côté serveur
  return 'client-side';
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserType | null;
  loading: boolean;
  signup: (data: BasicSignupFormData | ExtendedSignupFormData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserType>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await getUserById(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (data: BasicSignupFormData | ExtendedSignupFormData) => {
    try {
      // 1. Créer le compte Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // 2. Récupérer le plan d'abonnement
      const plan = await getMembershipPlanById(data.planId);
      if (!plan) {
        throw new Error('Plan d\'abonnement introuvable');
      }

      // 3. Calculer la date d'expiration
      const now = Timestamp.now();
      const startDate = now;
      let expiryDate: Timestamp | null = null;

      if (plan.period === 'month') {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        expiryDate = Timestamp.fromDate(expiry);
      } else if (plan.period === 'year') {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiryDate = Timestamp.fromDate(expiry);
      }
      // Pour lifetime, expiryDate reste null

      // 4. Préparer les données utilisateur de base
      const userData: Omit<UserType, 'uid' | 'createdAt' | 'updatedAt' | 'qrCode'> = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        postalCode: data.postalCode,
        birthDate: Timestamp.fromDate(new Date(data.birthDate)),
        phone: data.phone,

        status: {
          tags: ['actif'],
          isAccountBlocked: false,
          isCardBlocked: false,
        },

        registration: {
          source: 'platform',
          createdAt: now,
          ipAddress: getClientIP(),
          userAgent: navigator.userAgent,
        },

        currentMembership: {
          planId: plan.id,
          planName: plan.name,
          planType: periodToMembershipType(plan.period), // ✅ Conversion vers le standard
          status: 'pending', // Sera 'active' après paiement
          paymentStatus: 'pending',
          startDate,
          expiryDate,
          price: plan.price,
          autoRenew: plan.period !== 'lifetime',
        },

        loyaltyPoints: 0,
      };

      // 5. Ajouter le profil étendu si abonnement annuel
      if (isExtendedSignup(data) && plan.period === 'year') {
        userData.extendedProfile = {
          professional: {
            profession: data.profession,
            activityDomain: data.activityDomain,
            status: data.professionalStatus,
            volunteerWork: data.isVolunteer ? {
              isVolunteer: true,
              domains: data.volunteerDomains,
            } : undefined,
            skills: data.skills,
          },
          interests: {
            eventTypes: data.eventTypes,
            artisticDomains: data.artisticDomains,
            musicGenres: data.musicGenres || [],
            conferenceThemes: data.conferenceThemes || [],
          },
          communication: {
            preferredContact: data.preferredContact,
            socialMedia: {
              instagram: data.instagram,
              facebook: data.facebook,
              linkedin: data.linkedin,
              tiktok: data.tiktok,
              youtube: data.youtube,
              blog: data.blog,
              website: data.website,
            },
            publicProfileConsent: data.publicProfileConsent,
            publicProfileLevel: data.publicProfileLevel,
          },
          engagement: {
            howDidYouKnowUs: data.howDidYouKnowUs,
            suggestions: data.suggestions,
            participationInterest: {
              interested: data.participationInterested,
              domains: data.participationDomains || [],
            },
          },
        };
      }

      // 6. Créer l'utilisateur dans Firestore (avec QR code automatique)
      await createUser(userData, userCredential.user.uid, getClientIP(), navigator.userAgent);

      // 7. Charger le profil créé
      const profile = await getUserById(userCredential.user.uid);
      setUserProfile(profile);

      // TODO: Rediriger vers le paiement (Stripe, etc.)

    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const updateUserProfile = async (data: Partial<UserType>) => {
    if (!currentUser) throw new Error('No user logged in');

    // Utiliser le service pour mettre à jour
    await updateUser(currentUser.uid, data);

    // Recharger le profil
    const updatedProfile = await getUserById(currentUser.uid);
    setUserProfile(updatedProfile);
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
