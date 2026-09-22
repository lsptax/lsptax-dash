import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CornerDownLeft,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { EmailTemplatePlaceholder } from "@/api/emailTemplates";

const SHORT_LABELS: Record<string, string> = {
  clientName: "Client name",
  year: "Tax year",
  propertySuffix: "Property note",
  logo: "Logo",
  paymentAmount: "Payment amount",
  propertyAddress: "Property address",
};

export function placeholderTitle(placeholder: Pick<EmailTemplatePlaceholder, "token" | "label">) {
  return SHORT_LABELS[placeholder.token] || placeholder.label.split(/[.,]/)[0].trim();
}

const EmailParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
      },
    };
  },
});

const TemplateToken = TiptapNode.create({
  name: "templateToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      token: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-template-token"),
        renderHTML: (attributes) =>
          attributes.token ? { "data-template-token": attributes.token } : {},
      },
      label: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-template-label") || element.textContent,
        renderHTML: (attributes) =>
          attributes.label ? { "data-template-label": attributes.label } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-template-token]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "template-token", contenteditable: "false" }),
      node.attrs.label || node.attrs.token || "Field",
    ];
  },
});

const TemplateLogo = TiptapNode.create({
  name: "templateLogo",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-template-logo]" }];
  },
  renderHTML() {
    return ["div", { "data-template-logo": "logo", class: "template-logo", contenteditable: "false" }, "Logo"];
  },
});

function emailHtmlToEditorHtml(html: string, labels: Record<string, string>) {
  const doc = new DOMParser().parseFromString(`<div id="email-root">${html}</div>`, "text/html");
  const root = doc.getElementById("email-root");
  if (!root) return html;
  const tokenPattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  const replaceTokens = (node: globalThis.Node) => {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (!text.includes("{{")) return;
      const fragment = doc.createDocumentFragment();
      let last = 0;
      tokenPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = tokenPattern.exec(text))) {
        if (match.index > last) fragment.append(doc.createTextNode(text.slice(last, match.index)));
        const token = match[1];
        if (token === "logo") {
          const logo = doc.createElement("div");
          logo.setAttribute("data-template-logo", "logo");
          fragment.append(logo);
        } else {
          const span = doc.createElement("span");
          span.setAttribute("data-template-token", token);
          span.setAttribute("data-template-label", labels[token] || token);
          span.textContent = labels[token] || token;
          fragment.append(span);
        }
        last = match.index + match[0].length;
      }
      if (last < text.length) fragment.append(doc.createTextNode(text.slice(last)));
      node.parentNode?.replaceChild(fragment, node);
      return;
    }
    Array.from(node.childNodes).forEach(replaceTokens);
  };

  replaceTokens(root);

  root.querySelectorAll("p").forEach((paragraph) => {
    const content = Array.from(paragraph.childNodes).filter(
      (child) => child.nodeType !== globalThis.Node.TEXT_NODE || child.textContent?.trim()
    );
    if (
      content.length === 1 &&
      content[0].nodeType === globalThis.Node.ELEMENT_NODE &&
      (content[0] as Element).hasAttribute("data-template-logo")
    ) {
      paragraph.replaceWith(content[0]);
    }
  });

  return root.innerHTML;
}

function editorHtmlToEmailHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<div id="email-root">${html}</div>`, "text/html");
  const root = doc.getElementById("email-root");
  if (!root) return html.trim();

  root.querySelectorAll("span[data-template-token]").forEach((span) => {
    const token = span.getAttribute("data-template-token") || "";
    span.replaceWith(doc.createTextNode(`{{${token}}}`));
  });
  root.querySelectorAll("[data-template-logo]").forEach((logo) => {
    logo.replaceWith(doc.createTextNode("{{logo}}"));
  });

  const text = (root.textContent || "").replace(/\u00a0/g, " ").trim();
  if (!text) return "";
  return root.innerHTML.trim();
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function EmailTemplateBodyEditor({
  value,
  placeholders,
  onChange,
}: {
  value: string;
  placeholders: EmailTemplatePlaceholder[];
  onChange: (html: string) => void;
}) {
  const labels = useMemo(() => {
    const next: Record<string, string> = {};
    for (const placeholder of placeholders) next[placeholder.token] = placeholderTitle(placeholder);
    return next;
  }, [placeholders]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const emittedRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        paragraph: false,
      }),
      EmailParagraph,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      TemplateToken,
      TemplateLogo,
    ],
    content: emailHtmlToEditorHtml(value, labels),
    editorProps: {
      attributes: {
        id: "email-template-body",
        "aria-label": "Email message",
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = editorHtmlToEmailHtml(current.getHTML());
      emittedRef.current = next;
      onChangeRef.current(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (emittedRef.current === value) return;
    const current = editorHtmlToEmailHtml(editor.getHTML());
    if (current === value) return;
    editor.commands.setContent(emailHtmlToEditorHtml(value, labels), false);
  }, [editor, labels, value]);

  function insertPlaceholder(placeholder: EmailTemplatePlaceholder) {
    if (!editor) return;
    if (placeholder.token === "logo" || placeholder.raw) {
      editor.chain().focus().insertContent({ type: "templateLogo" }).run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "templateToken",
        attrs: { token: placeholder.token, label: placeholderTitle(placeholder) },
      })
      .run();
  }

  function editLink() {
    if (!editor) return;
    const previous = (editor.getAttributes("link").href as string | undefined) || "";
    const next = window.prompt("Link address", previous || "https://");
    if (next == null) return;
    if (!next.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next.trim() }).run();
  }

  return (
    <div className="email-body-editor overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        <ToolButton
          label="Undo"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolButton
          label="Bold"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolButton>
        <ToolButton label="Line break" onClick={() => editor?.chain().focus().setHardBreak().run()}>
          <CornerDownLeft />
        </ToolButton>
        <ToolButton label="Link" active={editor?.isActive("link")} onClick={editLink}>
          <Link2 />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 px-2.5">
              Insert field
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {placeholders.map((placeholder) => (
              <DropdownMenuItem
                key={placeholder.token}
                onSelect={() => insertPlaceholder(placeholder)}
                className="flex flex-col items-start gap-0.5"
              >
                <span>{placeholderTitle(placeholder)}</span>
                <span className="text-xs text-muted-foreground">{placeholder.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
