import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Modal, Button, Group, Stack, Text, Paper } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import EmailEditor from 'react-email-editor';
import type { EditorRef } from 'react-email-editor';

export interface EmailEditorModalHandle {
  open: () => void;
  close: () => void;
  getDesign: () => Promise<{ design: any; html: string }>;
  loadDesign: (design: any) => void;
}

interface EmailEditorModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (design: any, html: string) => void;
  initialDesign?: any;
}

export const EmailEditorModal = forwardRef<EmailEditorModalHandle, EmailEditorModalProps>(
  ({ opened, onClose, onSave, initialDesign }, ref) => {
    const emailEditorRef = useRef<EditorRef>(null);

    useImperativeHandle(ref, () => ({
      open: () => {},
      close: onClose,
      getDesign: async () => {
        return new Promise((resolve) => {
          const editor = emailEditorRef.current?.editor;
          if (!editor) {
            resolve({ design: null, html: '' });
            return;
          }

          editor.exportHtml((data) => {
            const { design, html } = data;
            resolve({ design, html });
          });
        });
      },
      loadDesign: (design: any) => {
        const editor = emailEditorRef.current?.editor;
        if (editor && design) {
          editor.loadDesign(design);
        }
      },
    }));

    const handleSave = async () => {
      const editor = emailEditorRef.current?.editor;
      if (!editor) return;

      editor.exportHtml((data) => {
        const { design, html } = data;
        onSave(design, html);
        onClose();
      });
    };

    const onEmailEditorReady = () => {
      const editor = emailEditorRef.current?.editor;
      if (editor && initialDesign) {
        editor.loadDesign(initialDesign);
      }
    };

    return (
      <Modal
        opened={opened}
        onClose={onClose}
        size="100%"
        padding={0}
        withCloseButton={false}
        styles={{
          body: { height: '100vh', padding: 0 },
          content: { height: '100vh' },
        }}
      >
        <Stack gap={0} style={{ height: '100vh' }}>
          {/* Header */}
          <Paper p="md" shadow="sm" style={{ borderBottom: '1px solid #e0e0e0' }}>
            <Group justify="space-between">
              <div>
                <Text fw={700} size="lg">
                  Éditeur d'email
                </Text>
                <Text size="sm" c="dimmed">
                  Créez votre email en glissant-déposant des éléments
                </Text>
              </div>
              <Group>
                <Button
                  variant="default"
                  leftSection={<IconX size={18} />}
                  onClick={onClose}
                >
                  Annuler
                </Button>
                <Button
                  leftSection={<IconCheck size={18} />}
                  onClick={handleSave}
                  color="green"
                >
                  Enregistrer
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* Editor */}
          <Box style={{ flex: 1, overflow: 'hidden' }}>
            <EmailEditor
              ref={emailEditorRef}
              onReady={onEmailEditorReady}
              minHeight="calc(100vh - 80px)"
              options={{
                displayMode: 'email',
                locale: 'fr-FR',
                appearance: {
                  theme: 'light',
                },
                features: {
                  textEditor: {
                    spellChecker: true,
                  },
                },
                mergeTags: {
                  first_name: {
                    name: 'Prénom',
                    value: '{{first_name}}',
                  },
                  last_name: {
                    name: 'Nom',
                    value: '{{last_name}}',
                  },
                  email: {
                    name: 'Email',
                    value: '{{email}}',
                  },
                  membership_type: {
                    name: 'Type d\'abonnement',
                    value: '{{membership_type}}',
                  },
                },
              }}
            />
          </Box>
        </Stack>
      </Modal>
    );
  }
);

EmailEditorModal.displayName = 'EmailEditorModal';

// Helper component for Box (if not imported from mantine)
function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}
