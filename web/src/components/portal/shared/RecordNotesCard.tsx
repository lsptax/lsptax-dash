import { useEffect, useState, type ReactNode } from "react";
import { Mark, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Highlighter, Italic, List, ListOrdered, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Note = { id: string; body: string };

const Highlight = Mark.create({
  name: "highlight",
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0];
  },
});

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "EM", "B", "I", "MARK", "UL", "OL", "LI"]);

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function notesToEditorHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function noteBodyFromHtml(html: string) {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  if (!text.replace(/\u00a0/g, " ").trim()) return "";
  return html.trim();
}

function sanitizeNoteHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${notesToEditorHtml(html)}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const clean = (node: Element) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const element = child as HTMLElement;
      if (!ALLOWED_TAGS.has(element.tagName)) {
        element.replaceWith(doc.createTextNode(element.textContent || ""));
        continue;
      }
      for (const attr of Array.from(element.attributes)) element.removeAttribute(attr.name);
      clean(element);
    }
  };

  clean(root);
  return root.innerHTML;
}

function parseNotes(value: string): Note[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => item && typeof item === "object" && "body" in item)
      ) {
        return parsed.flatMap((item) => {
          const record = item as { id?: unknown; body?: unknown };
          const body = noteBodyFromHtml(typeof record.body === "string" ? record.body : "");
          if (!body) return [];
          const id = typeof record.id === "string" && record.id ? record.id : crypto.randomUUID();
          return [{ id, body }];
        });
      }
    } catch {
      // Older notes were stored as plain text or a single HTML block.
    }
  }
  const body = noteBodyFromHtml(notesToEditorHtml(trimmed));
  return body ? [{ id: "existing", body }] : [];
}

function serializeNotes(notes: Note[]) {
  return notes.length ? JSON.stringify(notes) : "";
}

function showNotesPlaceholder(editor: Editor | null) {
  if (!editor) return false;
  const { doc } = editor.state;
  if (doc.childCount !== 1) return false;
  const node = doc.firstChild;
  return node?.type.name === "paragraph" && node.content.size === 0;
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NotesToolbar({ editor }: { editor: Editor | null }) {
  const run = (command: (current: Editor) => void) => {
    if (!editor) return;
    command(editor);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
      <ToolButton
        label="Bold"
        active={editor?.isActive("bold")}
        onClick={() => run((current) => current.chain().focus().toggleBold().run())}
      >
        <Bold />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor?.isActive("italic")}
        onClick={() => run((current) => current.chain().focus().toggleItalic().run())}
      >
        <Italic />
      </ToolButton>
      <ToolButton
        label="Highlight"
        active={editor?.isActive("highlight")}
        onClick={() => run((current) => current.chain().focus().toggleMark("highlight").run())}
      >
        <Highlighter />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton
        label="Bulleted list"
        active={editor?.isActive("bulletList")}
        onClick={() => run((current) => current.chain().focus().toggleBulletList().run())}
      >
        <List />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor?.isActive("orderedList")}
        onClick={() => run((current) => current.chain().focus().toggleOrderedList().run())}
      >
        <ListOrdered />
      </ToolButton>
    </div>
  );
}

function NoteComposer({
  initialHtml,
  saving,
  onCancel,
  onSave,
}: {
  initialHtml: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (body: string) => void;
}) {
  const [draft, setDraft] = useState(() => noteBodyFromHtml(notesToEditorHtml(initialHtml)));
  const baseline = noteBodyFromHtml(notesToEditorHtml(initialHtml));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Highlight,
    ],
    content: notesToEditorHtml(initialHtml),
    editorProps: {
      attributes: {
        "aria-label": "Note",
      },
    },
    onCreate: ({ editor: current }) => {
      setDraft(noteBodyFromHtml(current.getHTML()));
    },
    onUpdate: ({ editor: current }) => {
      setDraft(noteBodyFromHtml(current.getHTML()));
    },
  });

  return (
    <div>
      <div className="notes-editor overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
        <NotesToolbar editor={editor} />
        <div className="relative">
          {showNotesPlaceholder(editor) ? (
            <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">Add notes</p>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving || !draft || draft === baseline}
          onClick={() => onSave(draft)}
        >
          {saving ? <LoaderCircle className="animate-spin" /> : null}
          Save note
        </Button>
      </div>
    </div>
  );
}

export function RecordNotesCard({
  title,
  description,
  value,
  onSave,
  compact = false,
  headerAction,
}: {
  title: string;
  description: string;
  value: string;
  onSave: (notes: string) => Promise<void>;
  compact?: boolean;
  headerAction?: ReactNode;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>(() => parseNotes(value));
  const [mode, setMode] = useState<{ type: "idle" } | { type: "add" } | { type: "edit"; id: string }>({
    type: "idle",
  });
  const [saving, setSaving] = useState(false);
  const idle = mode.type === "idle";

  useEffect(() => {
    setNotes(parseNotes(value));
  }, [value]);

  const persist = async (next: Note[], savedTitle: string) => {
    setSaving(true);
    try {
      await onSave(serializeNotes(next));
      setNotes(next);
      setMode({ type: "idle" });
      toast({ title: savedTitle });
    } catch (error) {
      toast({
        title: "Could not save notes",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5",
        compact ? "" : "mb-8"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {idle ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setMode({ type: "add" })}>
              Add note
            </Button>
          ) : null}
          {headerAction}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {mode.type === "add" ? (
          <NoteComposer
            initialHtml=""
            saving={saving}
            onCancel={() => setMode({ type: "idle" })}
            onSave={(body) =>
              void persist([{ id: crypto.randomUUID(), body }, ...notes], "Note saved")
            }
          />
        ) : null}

        {notes.map((note) =>
          mode.type === "edit" && mode.id === note.id ? (
            <NoteComposer
              key={note.id}
              initialHtml={note.body}
              saving={saving}
              onCancel={() => setMode({ type: "idle" })}
              onSave={(body) =>
                void persist(
                  notes.map((item) => (item.id === note.id ? { ...item, body } : item)),
                  "Note saved"
                )
              }
            />
          ) : (
            <article key={note.id} className="relative rounded-md border border-border bg-background px-3 py-2">
              {idle ? (
                <div className="absolute right-1 top-1 flex gap-0.5">
                  <button
                    type="button"
                    aria-label="Edit note"
                    title="Edit"
                    disabled={saving}
                    onClick={() => setMode({ type: "edit", id: note.id })}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
                  >
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete note"
                    title="Delete"
                    disabled={saving}
                    onClick={() =>
                      void persist(
                        notes.filter((item) => item.id !== note.id),
                        "Note deleted"
                      )
                    }
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
                  >
                    <Trash2 />
                  </button>
                </div>
              ) : null}
              <div
                className={cn("notes-read text-sm", idle && "pr-12")}
                dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.body) }}
              />
            </article>
          )
        )}

        {notes.length === 0 && mode.type !== "add" ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : null}
      </div>
    </section>
  );
}
