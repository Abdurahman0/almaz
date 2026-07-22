/**
 * ⚠️ MOCK MODULE — the backend has no /customers CRUD resource, so the Clients
 * page runs on this localStorage-backed mock. Swap: replace the exports below
 * with real API calls in src/features/clients/api.ts once the endpoint ships.
 */

export interface MockPurchase {
  id: string;
  productName: string;
  amount: number;
  date: string; // ISO
}

export interface MockClient {
  id: string;
  fullName: string;
  phone: string;
  ringSize: number | null;
  notes: string;
  anniversary: string | null; // wedding day, ISO
  totalPurchases: number;
  purchases: MockPurchase[];
  createdAt: string;
}

export type MockClientInput = Omit<MockClient, 'id' | 'purchases' | 'totalPurchases' | 'createdAt'>;

const STORAGE_KEY = 'almaz-mock-clients';
const LATENCY_MS = 350;

const seed: MockClient[] = [
  {
    id: 'c1',
    fullName: 'Dilnoza Karimova',
    phone: '+998 90 123 45 67',
    ringSize: 16.5,
    notes: "Brilliantli to'plamlarni yaxshi ko'radi",
    anniversary: '2019-08-14',
    totalPurchases: 128_500_000,
    purchases: [
      { id: 'p1', productName: 'Brilliant uzuk «Yulduz»', amount: 84_000_000, date: '2025-11-02' },
      { id: 'p2', productName: 'Oltin sirg\'a 750', amount: 44_500_000, date: '2026-03-08' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 'c2',
    fullName: 'Aziz Rahimov',
    phone: '+998 93 555 12 34',
    ringSize: 20,
    notes: 'Nikoh uzuklari uchun keldi',
    anniversary: '2026-08-02',
    totalPurchases: 62_000_000,
    purchases: [
      { id: 'p3', productName: 'Nikoh uzuklari juftligi', amount: 62_000_000, date: '2026-05-20' },
    ],
    createdAt: '2025-06-10',
  },
  {
    id: 'c3',
    fullName: 'Malika Yusupova',
    phone: '+998 97 800 22 11',
    ringSize: 17,
    notes: '',
    anniversary: null,
    totalPurchases: 24_800_000,
    purchases: [
      { id: 'p4', productName: "Feruzali oltin uzuk", amount: 24_800_000, date: '2026-02-14' },
    ],
    createdAt: '2025-12-01',
  },
  {
    id: 'c4',
    fullName: 'Jasur Toshpulatov',
    phone: '+998 99 411 77 88',
    ringSize: null,
    notes: 'Sovg\'a tanlashda maslahat kerak',
    anniversary: null,
    totalPurchases: 8_200_000,
    purchases: [
      { id: 'p5', productName: 'Kumush braslet', amount: 8_200_000, date: '2026-06-30' },
    ],
    createdAt: '2026-04-22',
  },
];

function load(): MockClient[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as MockClient[];
  } catch {
    return seed;
  }
}

function save(clients: MockClient[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS));

export async function mockListClients(): Promise<MockClient[]> {
  await delay();
  return load();
}

export async function mockCreateClient(input: MockClientInput): Promise<MockClient> {
  await delay();
  const clients = load();
  const client: MockClient = {
    ...input,
    id: `c${Date.now()}`,
    purchases: [],
    totalPurchases: 0,
    createdAt: new Date().toISOString(),
  };
  save([client, ...clients]);
  return client;
}

export async function mockUpdateClient(id: string, input: Partial<MockClientInput>): Promise<MockClient> {
  await delay();
  const clients = load();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Mijoz topilmadi');
  clients[idx] = { ...clients[idx], ...input };
  save(clients);
  return clients[idx];
}

export async function mockDeleteClient(id: string): Promise<void> {
  await delay();
  save(load().filter((c) => c.id !== id));
}
