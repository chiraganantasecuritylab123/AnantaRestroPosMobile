import React, {useCallback, useEffect, useState} from 'react';
import {AppDialog, type AppDialogButton} from '../components/ui/AppDialog';

type DialogState = {
  title: string;
  message?: string;
  buttons: AppDialogButton[];
};

type ShowDialogFn = (
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
) => void;

let showDialogImpl: ShowDialogFn | null = null;

export function showDialog(
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
): void {
  if (showDialogImpl) {
    showDialogImpl(title, message, buttons);
    return;
  }
  console.warn('[showDialog] DialogProvider is not mounted:', title, message);
}

export const DialogProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openDialog = useCallback<ShowDialogFn>((title, message, buttons) => {
    setDialog({
      title,
      message,
      buttons: buttons?.length ? buttons : [{text: 'OK'}],
    });
  }, []);

  const dismiss = useCallback((button: AppDialogButton) => {
    setDialog(null);
    button.onPress?.();
  }, []);

  useEffect(() => {
    showDialogImpl = openDialog;
    return () => {
      showDialogImpl = null;
    };
  }, [openDialog]);

  return (
    <>
      {children}
      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        buttons={dialog?.buttons ?? [{text: 'OK'}]}
        onDismiss={dismiss}
      />
    </>
  );
};
