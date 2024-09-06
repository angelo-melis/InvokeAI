import { IconButton } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { entityDuplicated } from 'features/controlLayers/store/canvasSlice';
import { selectSelectedEntityIdentifier } from 'features/controlLayers/store/selectors';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCopyFill } from 'react-icons/pi';

export const EntityListSelectedEntityActionBarDuplicateButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedEntityIdentifier = useAppSelector(selectSelectedEntityIdentifier);
  const onClick = useCallback(() => {
    if (!selectedEntityIdentifier) {
      return;
    }
    dispatch(entityDuplicated({ entityIdentifier: selectedEntityIdentifier }));
  }, [dispatch, selectedEntityIdentifier]);

  return (
    <IconButton
      onClick={onClick}
      isDisabled={!selectedEntityIdentifier}
      size="sm"
      variant="link"
      alignSelf="stretch"
      aria-label={t('controlLayers.duplicate')}
      tooltip={t('controlLayers.duplicate')}
      icon={<PiCopyFill />}
    />
  );
});

EntityListSelectedEntityActionBarDuplicateButton.displayName = 'EntityListSelectedEntityActionBarDuplicateButton';