import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { TermData, LanguageSpecificTermData } from '../types';

export const saveAllDefaultDefinitionsToFirebase = async (allTermsData: TermData[]) => {
  console.log("Starting to save all default options to Firebase...");
  for (const termData of allTermsData) {
    const termId = termData.id;
    if (!termId) {
      console.warn("Skipping a term because it has no ID.", termData);
      continue;
    }
    console.log(`Processing term: ${termId}`);
    const termOptionsDocRef = doc(db, 'cardOptions', termId);

    try {
      const enDefs = termData.en.defaultDefinition;
      const deDefs = termData.de.defaultDefinition;

      const typeCategoryOptions = [
        { ...enDefs.typeCategory, language: 'en' },
        { ...deDefs.typeCategory, language: 'de' }
      ];
      const keyAttributesOptions = [
        { ...enDefs.keyAttributes, language: 'en' },
        { ...deDefs.keyAttributes, language: 'de' }
      ];
      const impactPurposeOptions = [
        { ...enDefs.impactPurpose, language: 'en' },
        { ...deDefs.impactPurpose, language: 'de' }
      ];

      await setDoc(termOptionsDocRef, {
        typeCategory: typeCategoryOptions,
        keyAttributes: keyAttributesOptions,
        impactPurpose: impactPurposeOptions
      });

      console.log(`Successfully created/updated default options for ${termId}`);
    } catch (error) {
      console.error(`Error processing term ${termId}:`, error);
    }
  }
  alert("Finished populating/updating Firestore with all default term options. Check the console for details.");
};

export const handleDeleteAllCardOptions = async (
    setAllTypeCategoryOptions: Function,
    setAllKeyAttributesOptions: Function,
    setAllImpactPurposeOptions: Function,
    setSelectedTypeCategory: Function,
    setSelectedKeyAttributes: Function,
    setSelectedImpactPurpose: Function,
    currentTermDisplayData: LanguageSpecificTermData
) => {
  const confirmation = window.confirm(
    "Are you sure you want to delete ALL user-added and default card options from Firebase? This action cannot be undone. You will need to click 'Save Defaults to DB' again to restore the initial cards."
  );
  if (confirmation) {
    console.log("Starting to delete all card options from Firebase...");
    try {
      const optionsCollectionRef = collection(db, 'cardOptions');
      const querySnapshot = await getDocs(optionsCollectionRef);
      
      if (querySnapshot.empty) {
        alert("No card options found in Firestore to delete.");
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        console.log(`Queueing deletion for doc: ${doc.id}`);
        batch.delete(doc.ref);
      });

      await batch.commit();

      setAllTypeCategoryOptions([]);
      setAllKeyAttributesOptions([]);
      setAllImpactPurposeOptions([]);

      setSelectedTypeCategory(currentTermDisplayData.defaultDefinition.typeCategory);
      setSelectedKeyAttributes(currentTermDisplayData.defaultDefinition.keyAttributes);
      setSelectedImpactPurpose(currentTermDisplayData.defaultDefinition.impactPurpose);

      alert("Successfully deleted all card options from Firebase.");
      console.log("All card options have been deleted.");
      
    } catch (error) {
      console.error("Error deleting card options:", error);
      alert("An error occurred while deleting card options. Check the console for details.");
    }
  }
}; 