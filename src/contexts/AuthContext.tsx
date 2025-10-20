import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile, SignupFormData } from '../types/user';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (data: SignupFormData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (data: SignupFormData) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const now = new Date();
    const membershipEndDate = data.membershipType === 'monthly'
      ? new Date(now.setMonth(now.getMonth() + 1))
      : data.membershipType === 'annual'
      ? new Date(now.setFullYear(now.getFullYear() + 1))
      : undefined; // Pas de date de fin pour honorary

    const userProfile: UserProfile = {
      uid: userCredential.user.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      phone: data.phone,
      postalCode: data.postalCode,
      createdAt: new Date().toISOString(),

      // Abonnement
      membership: {
        type: data.membershipType,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: membershipEndDate?.toISOString(),
        validUntil: membershipEndDate?.toISOString(),
        autoRenew: data.membershipType !== 'honorary', // Pas de renouvellement auto pour honorary
      },

      // Programme de fidélité
      loyaltyPoints: 0,

      // Historique d'activité - première entrée
      activityHistory: [
        {
          id: `${Date.now()}-signup`,
          type: 'subscription',
          title: `Adhésion ${data.membershipType === 'monthly' ? 'mensuelle' : data.membershipType === 'annual' ? 'annuelle' : 'd\'honneur'}`,
          description: 'Création du compte et souscription à l\'adhésion',
          date: new Date().toISOString(),
          points: data.membershipType === 'annual' ? 50 : data.membershipType === 'honorary' ? 200 : 10,
        },
      ],

      // Étiquettes par défaut
      tags: ['actif'],

      // Pas d'intérêts pour le moment (peut être ajouté plus tard)
      interests: [],
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
    setUserProfile(userProfile);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No user logged in');

    const updatedProfile = { ...userProfile, ...data } as UserProfile;
    await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true });
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
