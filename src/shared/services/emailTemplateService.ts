import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { EmailTemplateCustom } from '../types/campaign';

const EMAIL_TEMPLATES_COLLECTION = 'emailTemplates';

// ============================================================================
// GESTION DES TEMPLATES EMAIL PERSONNALISES
// ============================================================================

/**
 * Sauvegarde un nouveau template email personnalise
 */
export async function saveEmailTemplate(
  data: {
    name: string;
    description?: string;
    designJson: string;
    thumbnailHtml?: string;
    createdBy: string;
  }
): Promise<EmailTemplateCustom> {
  try {
    const now = Timestamp.now();

    const templateData: any = {
      name: data.name,
      designJson: data.designJson,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (data.description && data.description.trim()) {
      templateData.description = data.description;
    }

    if (data.thumbnailHtml && data.thumbnailHtml.trim()) {
      // Tronquer le HTML de preview a 5000 caracteres max
      templateData.thumbnailHtml = data.thumbnailHtml.substring(0, 5000);
    }

    const templatesRef = collection(db, EMAIL_TEMPLATES_COLLECTION);
    const docRef = await addDoc(templatesRef, templateData);

    return {
      ...templateData,
      id: docRef.id,
    } as EmailTemplateCustom;
  } catch (error) {
    console.error('Error saving email template:', error);
    throw error;
  }
}

/**
 * Recupere tous les templates email personnalises
 */
export async function getEmailTemplates(): Promise<EmailTemplateCustom[]> {
  try {
    const templatesRef = collection(db, EMAIL_TEMPLATES_COLLECTION);
    const q = query(templatesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as EmailTemplateCustom[];
  } catch (error) {
    console.error('Error getting email templates:', error);
    throw error;
  }
}

/**
 * Recupere un template email par son ID
 */
export async function getEmailTemplateById(templateId: string): Promise<EmailTemplateCustom | null> {
  try {
    const templateRef = doc(db, EMAIL_TEMPLATES_COLLECTION, templateId);
    const templateDoc = await getDoc(templateRef);

    if (templateDoc.exists()) {
      return {
        ...templateDoc.data(),
        id: templateDoc.id,
      } as EmailTemplateCustom;
    }

    return null;
  } catch (error) {
    console.error('Error getting email template:', error);
    throw error;
  }
}

/**
 * Met a jour un template email personnalise
 */
export async function updateEmailTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    designJson?: string;
    thumbnailHtml?: string;
  }
): Promise<void> {
  try {
    const templateRef = doc(db, EMAIL_TEMPLATES_COLLECTION, templateId);

    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    if (data.name !== undefined) {
      updates.name = data.name;
    }

    if (data.description !== undefined) {
      updates.description = data.description;
    }

    if (data.designJson !== undefined) {
      updates.designJson = data.designJson;
    }

    if (data.thumbnailHtml !== undefined) {
      updates.thumbnailHtml = data.thumbnailHtml.substring(0, 5000);
    }

    await updateDoc(templateRef, updates);
  } catch (error) {
    console.error('Error updating email template:', error);
    throw error;
  }
}

/**
 * Supprime un template email personnalise
 */
export async function deleteEmailTemplate(templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, EMAIL_TEMPLATES_COLLECTION, templateId);
    await deleteDoc(templateRef);
  } catch (error) {
    console.error('Error deleting email template:', error);
    throw error;
  }
}
