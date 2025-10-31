# Firestore Database Structure

This document outlines the structure and organization of the Firestore database used in the Fornap application.

## Overview

The Fornap application primarily uses a single top-level collection named `users` to store all user-related data. Each document within this collection represents a unique user and is identified by their Firebase Authentication User ID (UID).

## Collections

### 1. `users` Collection

*   **Purpose**: Stores comprehensive profile information for each registered user of the application.
*   **Document ID**: The `uid` (User ID) provided by Firebase Authentication. This ensures a direct link between the authentication record and the user's profile data.
*   **Document Structure**: Each document adheres to the `UserProfile` interface defined in `src/types/user.ts`. Below are the key fields and their descriptions:

    ```typescript
    interface UserProfile {
      uid: string; // Firebase Authentication User ID (Document ID)
      email: string; // User's email address
      createdAt: string; // ISO date string of account creation

      // Personal Information
      firstName: string;
      lastName: string;
      dateOfBirth?: string; // ISO date string
      phone?: string;
      postalCode?: string;

      // Membership Details
      membership?: {
        type: 'monthly' | 'annual' | 'honorary';
        status: 'active' | 'inactive' | 'pending' | 'expired';
        startDate: string; // ISO date string
        endDate?: string; // ISO date string (undefined for honorary)
        validUntil?: string; // ISO date string
        autoRenew?: boolean;
      };
      // Note: 'subscription' field is also present, mirroring 'membership' for compatibility.
      subscription?: {
        type: string;
        status: 'active' | 'inactive';
        startDate: string;
        endDate: string;
        autoRenew?: boolean;
      };

      // Loyalty Program
      loyaltyPoints: number; // Accumulated loyalty points

      // Activity History
      activityHistory: Array<{
        id: string;
        type: 'event' | 'purchase' | 'workshop' | 'subscription' | 'other';
        title: string;
        description?: string;
        date: string; // ISO date string
        points?: number; // Points gained from this activity
      }>;

      // Customizable Tags
      tags: Array<'actif' | 'inactif' | 'vip' | 'atelier_couture' | 'billetterie' | 'exposant' | string>;

      // Interests (Optional)
      interests?: string[];

      // Personality Questions (Optional)
      howDidYouHearAboutUs?: string;
      preferredAmbiance?: string;

      // QR Code for Member Identification
      qrCode?: string; // Content: "FORNAP-MEMBER:{uid}"
    }
    ```

## Data Flow and Operations

### User Creation (Signup)

1.  A new user signs up via the application's signup flow.
2.  Firebase Authentication creates a new user record, providing a unique `uid`.
3.  A new document is created in the `users` collection with the `uid` as its document ID.
4.  The document is populated with data from the signup form (`SignupFormData`) and default values (e.g., `loyaltyPoints: 0`, initial `activityHistory` entry, `tags: ['actif']`).
5.  The `qrCode` field is generated using the format `FORNAP-MEMBER:{uid}`.
6.  This operation is handled by the `signup` function within `src/contexts/AuthContext.tsx`.

### User Data Retrieval

1.  Upon successful authentication (login or session restoration), the `onAuthStateChanged` listener in `src/contexts/AuthContext.tsx` fetches the corresponding `UserProfile` document from the `users` collection using the authenticated user's `uid`.
2.  The `CheckIn` page (`src/pages/CheckIn.tsx`) reads a user's profile by scanning their QR code, extracting the `uid`, and then fetching the document from the `users` collection.

### User Data Updates

1.  User profile information can be updated via the `updateUserProfile` function in `src/contexts/AuthContext.tsx`.
2.  This function performs a partial update on the existing user document in the `users` collection using `setDoc` with the `merge: true` option.

## Relationships

Currently, the database schema is relatively flat, with all primary user data residing within the `users` collection. Relationships between different pieces of user data (e.g., membership, activity history) are embedded directly within the `UserProfile` document.

## QR Code Mechanism

*   The `qrCode` field in the `UserProfile` document stores a string in the format `FORNAP-MEMBER:{uid}`.
*   This format allows for easy parsing to retrieve the user's `uid` when a QR code is scanned, enabling quick lookup of user profiles (e.g., for check-in purposes).
*   The utility functions for generating and parsing QR code content are located in `src/utils/qrcode.ts`.
