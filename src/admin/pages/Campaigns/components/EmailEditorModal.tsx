import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Modal, Button, Group, Text, Paper } from '@mantine/core';
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
        fullScreen
        styles={{
          body: { height: '100vh', padding: 0, overflow: 'hidden' },
          content: { height: '100vh', overflow: 'hidden' },
          inner: { padding: 0 },
        }}
      >
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
        }}>
          {/* Header */}
          <Paper p="md" shadow="sm" style={{ borderBottom: '1px solid #e0e0e0', flexShrink: 0, zIndex: 10 }}>
            <Group justify="space-between">
              <div>
                <Text fw={700} size="lg">
                  Éditeur d'email visuel
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
          <div style={{
            position: 'absolute',
            top: '80px',
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}>
            <EmailEditor
              ref={emailEditorRef}
              onReady={onEmailEditorReady}
              minHeight="100%"
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
          </div>
        </div>
      </Modal>
    );
  }
);

EmailEditorModal.displayName = 'EmailEditorModal';
