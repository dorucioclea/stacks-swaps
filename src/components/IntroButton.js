import { Link } from '@reach/router';
import React from 'react';
import { AssetIcon } from './AssetIcon';
import { getAsset, getDeepLink } from './assets';

export function IntroButton({ type, trait }) {
  const to = getDeepLink(type, trait);
  const assetName = getAsset(type, trait);
  return (
    <Link to={to} type="button">
      <AssetIcon type={type} trait={trait} />
      Swap {assetName}
    </Link>
  );
}
