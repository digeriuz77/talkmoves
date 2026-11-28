/** Model-shaped fixtures for the server integration tests (what the LLM would return). */
import { chatCompletion, systemPromptOf, type MockResponder, type RecordedRequest } from './helpers';

export const GOLD_CARTOON_TOPIC =
  'Year 4 Science: Evaporation & States of Matter (Drying Clothes)';

/** The spec's gold-standard example, as the MODEL returns it (no server-added fields). */
export function goldCartoonModelOutput() {
  return {
    claims: [
      {
        character: 'Bisi',
        type: 'sound',
        english: 'Heat from the sun turns liquid water into invisible gas that moves into the air.',
        bridge: {
          iban: 'Panas matahari ngubah ai nyadi wap ti enda dipeda lalu tama ngagai angin.',
          sarawakMalay: 'Panas matahari tukar aik jadi wap yang sik nampak, lalu masuk ke udara.',
          ibanNeedsTeacherCheck: false,
        },
        teacherNote:
          'Sound reasoning: Identifies state change (liquid to gas) driven by heat even though water vapour is invisible.',
      },
      {
        character: 'Ali',
        type: 'misconception',
        english:
          'The water disappears completely into nothing when the wet shirt dries in the sun.',
        bridge: {
          iban: 'Ai nya lenyau terus nyadi nadai utai lebuh baju nya rangkai kena panas.',
          sarawakMalay: 'Aik ya hilang terus jadi sikda apa-apa bila baju ya kering kena panas.',
          ibanNeedsTeacherCheck: false,
        },
        teacherNote:
          'Conservation misconception: Pupils assume that because liquid water is no longer visible, it has ceased to exist.',
      },
      {
        character: 'Cempaka',
        type: 'language_trap',
        english: 'The wet shirt is melting in the hot sun, so all the water drips away.',
        bridge: {
          iban: 'Baju basah nya cair kena panas matahari, nya alai semua ai nitik kebaruh.',
          sarawakMalay: 'Baju basah ya cair kena panas matahari, sebab ya semua aik menitik ke bawah.',
          ibanNeedsTeacherCheck: false,
        },
        teacherNote:
          "Language trap: Confuses 'melting' (solid to liquid) with 'evaporation' (liquid to gas).",
      },
    ],
    sentenceStems: [
      'I agree with ___ because the evidence shows ___.',
      'I disagree with ___ because water does not ___.',
      'In Science, when liquid turns into gas, we call it ___.',
      'The difference between melting and evaporating is ___.',
    ],
    whatIfQuestion: {
      english:
        'What if we hang the exact same wet shirt inside a closed cupboard on a cool, rainy day? Will it dry faster or slower, and why?',
      bridge:
        'Kati enti baju basah nya digantung dalam almari ti ditutup lebuh hari chelap sereta ujan? Jampat agi tauka lubah agi rangkai, lalu nama kebuah?',
    },
    followUpChips: [
      {
        id: 'chip_misconception',
        label: 'Most picked the misconception (60s visual reset)',
        targetStrategy: 'S5',
        nextActionMode: 'reset',
        promptContext:
          'Majority chose the conservation misconception. Give a 30-second S5/S4 wet-handprint board demo showing water moving into the air.',
      },
      {
        id: 'chip_l1_bridge',
        label: 'They know it in Iban/Malay, stuck on English',
        targetStrategy: 'S3',
        nextActionMode: 'firm_up',
        promptContext:
          'Pupils understand the concept in Iban/Sarawak Malay but cannot form the English sentence. Give a 30-second S3 choral vocabulary + S4 revoice drill.',
      },
      {
        id: 'chip_what_if',
        label: 'They got it — push the What-If challenge',
        targetStrategy: 'S6',
        nextActionMode: 'firm_up',
        promptContext:
          'Pupils chose the sound claim quickly. Push the S6 What-If transfer twist comparing wind vs heat with a 1-minute S2 Turn & Talk.',
      },
    ],
  };
}

/**
 * Mock LLM that answers the Concept Cartoon Studio prompt with `cartoonOutput` and every other
 * endpoint with a minimal (empty) plan, which the existing sanitizers accept.
 */
export function standardResponder({
  cartoonOutput = goldCartoonModelOutput,
  onRequest,
}: {
  cartoonOutput?: () => unknown;
  onRequest?: (request: RecordedRequest, index: number) => unknown;
} = {}): MockResponder {
  return (request, index) => {
    if (onRequest) {
      const override = onRequest(request, index);
      if (override !== undefined) return override;
    }
    if (systemPromptOf(request).includes('You are the Concept Cartoon Studio')) {
      return chatCompletion(JSON.stringify(cartoonOutput()));
    }
    return chatCompletion('{}');
  };
}
