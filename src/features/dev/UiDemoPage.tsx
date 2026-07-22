import { useState } from 'react';
import { Gem, Pencil, Trash2 } from 'lucide-react';
import { endOfMonth, startOfMonth } from 'date-fns';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  ConfirmDialog,
  DatePicker,
  DateRangePicker,
  DropdownMenu,
  FileDropzone,
  Modal,
  MultiSelect,
  NumberInput,
  PageHeader,
  RadioGroup,
  Select,
  Switch,
  TimePicker,
  Tooltip,
  toast,
  type Range,
} from '@/shared/ui';
import { PRESETS } from '@/shared/lib/themes';
import { useUiStore } from '@/shared/stores/ui';

const fewOptions = [
  { value: 'a', label: 'Oltin uzuk', description: '585 proba, brilliant', icon: <Gem className="h-4 w-4" strokeWidth={1.5} /> },
  { value: 'b', label: 'Kumush sirg\'a', group: 'Kumush' },
  { value: 'c', label: 'Platina braslet', group: 'Kumush', disabled: true },
];
const manyOptions = Array.from({ length: 20 }, (_, i) => ({
  value: `v${i}`,
  label: `Mahsulot ${i + 1}`,
  description: i % 3 === 0 ? 'Omborda mavjud' : undefined,
}));

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-md font-semibold text-text">{name}</h2>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </Card>
  );
}

/** Dev-only visual QA route: every control in every state; switch presets from the topbar. */
export default function UiDemoPage() {
  const preset = useUiStore((s) => s.preset);
  const [sel, setSel] = useState('a');
  const [combo, setCombo] = useState<string>();
  const [multi, setMulti] = useState<string[]>(['v1', 'v2', 'v3']);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('r1');
  const [on, setOn] = useState(true);
  const [num, setNum] = useState<number | ''>(8_400_000);
  const [date, setDate] = useState('2026-07-21');
  const [range, setRange] = useState<Range>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [time, setTime] = useState('09:30');
  const [files, setFiles] = useState<File[]>([]);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        heading="UI kit — demo"
        subheading={`Joriy mavzu: ${PRESETS.find((p) => p.id === preset)?.label} — mavzuni topbar'dan almashtiring`}
      />

      <Section name="Select / Combobox / MultiSelect">
        <div className="w-64"><Select label="Select (3 ta)" options={fewOptions} value={sel} onChange={setSel} /></div>
        <div className="w-64"><Select label="Avtomatik combobox (20 ta)" options={manyOptions} value={combo} onChange={setCombo} /></div>
        <div className="w-64"><Combobox label="Combobox (majburiy)" options={fewOptions} value={combo} onChange={setCombo} /></div>
        <div className="w-64"><MultiSelect label="Multi-select" options={manyOptions} value={multi} onChange={setMulti} /></div>
        <div className="w-64"><Select label="Xato holati" options={fewOptions} error="Majburiy maydon" /></div>
        <div className="w-64"><Select label="O'chirilgan" options={fewOptions} disabled /></div>
      </Section>

      <Section name="Sana / Vaqt">
        <div className="w-56"><DatePicker label="Sana" value={date} onChange={setDate} /></div>
        <div><span className="mb-1.5 block text-2xs font-semibold uppercase tracking-caps text-muted">Oraliq</span>
          <DateRangePicker value={range} onChange={setRange} /></div>
        <div className="w-40"><TimePicker label="Vaqt" value={time} onChange={setTime} /></div>
        <div className="w-56"><DatePicker label="Xato" value="" onChange={() => undefined} error="Sana tanlanmagan" /></div>
      </Section>

      <Section name="Checkbox / Radio / Switch">
        <div className="space-y-3">
          <Checkbox checked={checked} onCheckedChange={setChecked} label="Faol mijoz" />
          <Checkbox checked="indeterminate" label="Qisman tanlangan" />
          <Checkbox checked disabled label="O'chirilgan" />
        </div>
        <RadioGroup
          value={radio}
          onChange={setRadio}
          options={[
            { value: 'r1', label: 'Toshkent' },
            { value: 'r2', label: 'Viloyat' },
            { value: 'r3', label: "O'chirilgan", disabled: true },
          ]}
        />
        <div className="space-y-3">
          <Switch checked={on} onCheckedChange={setOn} label="Bildirishnomalar" />
          <Switch checked disabled label="O'chirilgan" />
        </div>
      </Section>

      <Section name="NumberInput">
        <div className="w-56"><NumberInput label="Narx" value={num} onChange={setNum} suffix="so'm" thousands step={100_000} /></div>
        <div className="w-40"><NumberInput label="Og'irlik" value={3.85} onChange={() => undefined} suffix="g" step={0.1} /></div>
        <div className="w-40"><NumberInput label="Xato" value={''} onChange={() => undefined} error="Kiritilishi shart" /></div>
      </Section>

      <Section name="Tooltip / Menu / Dialog / Toast">
        <Tooltip content="Bu tavsiya narx — oltin kursidan hisoblangan">
          <Button variant="secondary">Tooltip (hover)</Button>
        </Tooltip>
        <DropdownMenu
          items={[
            { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> },
            { label: 'Nusxalash', submenu: [{ label: 'Havola' }, { label: 'ID' }] },
            { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, destructive: true, separatorBefore: true },
          ]}
        />
        <Button variant="secondary" onClick={() => setModal(true)}>Modal</Button>
        <Button variant="danger" onClick={() => setConfirm(true)}>Confirm</Button>
        <Button variant="ghost" onClick={() => toast.success('Muvaffaqiyatli saqlandi')}>Toast: success</Button>
        <Button variant="ghost" onClick={() => toast.error('Xatolik yuz berdi')}>Toast: error</Button>
        <Button variant="ghost" onClick={() => toast.info("Yangilanish o'rnatildi")}>Toast: info</Button>
      </Section>

      <Section name="Fayl yuklash">
        <div className="w-96"><FileDropzone files={files} onChange={setFiles} label="Mahsulot rasmlari" /></div>
      </Section>

      <Section name="Badge">
        <Badge tone="gold">Jarayonda</Badge>
        <Badge tone="success">Yakunlangan</Badge>
        <Badge tone="danger">Bekor qilingan</Badge>
        <Badge tone="muted">Qoralama</Badge>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} heading="Oddiy modal">
        <p className="text-sm text-muted">Fokus ushlab turiladi, Esc yopadi, overlay bosilsa yopiladi.</p>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); toast.success("O'chirildi"); }}
        heading="O'chirishni tasdiqlang"
        description="Bu amalni ortga qaytarib bo'lmaydi."
      />
    </div>
  );
}
