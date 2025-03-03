import React, { useRef, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { contracts, NETWORK } from '../lib/constants';
import { TxStatus } from './TxStatus';
import {
  AnchorMode,
  contractPrincipalCV,
  createAssetInfo,
  FungibleConditionCode,
  makeContractFungiblePostCondition,
  makeContractNonFungiblePostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  makeStandardSTXPostCondition,
  noneCV,
  NonFungibleConditionCode,
  PostConditionMode,
  someCV,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions';
import { Address } from './Address';
import { AssetIcon } from './AssetIcon';
import { getAsset, getAssetName } from './assets';
import { btcAddressToPubscriptCV } from '../lib/btcTransactions';
import { BN } from 'bn.js';

export function SwapCreate({ ownerStxAddress, type, trait, id, formData: formData1, blockHeight }) {
  const amountSatsRef = useRef();
  const btcRecipientRef = useRef();
  const nftIdRef = useRef();
  const amountRef = useRef();
  const assetRecipientRef = useRef();
  const traitRef = useRef();
  const [txId, setTxId] = useState();
  const [loading, setLoading] = useState();
  const [status, setStatus] = useState();
  const [formData, setFormData] = useState(formData1);
  const { doContractCall } = useConnect();

  const createAction = async () => {
    setLoading(true);
    const errors = [];
    if (amountSatsRef.current.value.trim() === '') {
      errors.push('positive numbers required to swap');
    }

    if (btcRecipientRef.current.value.trim() === '') {
      errors.push('BTC address is required');
    }
    if (errors.length > 0) {
      setLoading(false);
      setStatus(
        errors.map((e, index) => (
          <React.Fragment key={index}>
            {e}
            <br />
          </React.Fragment>
        ))
      );
      return;
    }
    const satsCV = uintCV(Math.floor(parseFloat(amountSatsRef.current.value.trim()) * 100_000_000));
    const btcReceiverCV = btcAddressToPubscriptCV(btcRecipientRef.current.value.trim());
    const contract = contracts[type];
    let functionArgs;
    let postConditions;
    switch (type) {
      case 'nft':
        const nftIdCV = uintCV(nftIdRef.current.value.trim());
        const nftReceiverCV = standardPrincipalCV(assetRecipientRef.current.value.trim());
        const [nftContractAddress, nftTail] = traitRef.current.value.trim().split('.');
        const [nftContractName, nftAssetName] = nftTail.split('::');
        if (!nftAssetName) {
          setStatus('"nft contract :: nft name" must be set');
          return;
        }
        const nftCV = contractPrincipalCV(nftContractAddress, nftContractName);
        functionArgs = [satsCV, btcReceiverCV, nftIdCV, nftReceiverCV, nftCV];
        postConditions = [
          makeStandardNonFungiblePostCondition(
            ownerStxAddress,
            NonFungibleConditionCode.DoesNotOwn,
            createAssetInfo(nftContractAddress, nftContractName, nftAssetName),
            nftIdCV
          ),
        ];
        break;
      case 'ft':
        const ftAmountCV = uintCV(amountRef.current.value.trim());
        const ftReceiverCV = assetRecipientRef.current.value.trim()
          ? someCV(standardPrincipalCV(assetRecipientRef.current.value.trim()))
          : noneCV();
        const [ftContractAddress, ftTail] = traitRef.current.value.trim().split('.');
        const [ftContractName, ftAssetName] = ftTail.split('::');
        if (!ftAssetName) {
          setStatus('"ft contract :: ft name" must be set');
          return;
        }
        const ftCV = contractPrincipalCV(ftContractAddress, ftContractName);
        functionArgs = [satsCV, btcReceiverCV, ftAmountCV, ftReceiverCV, ftCV];
        postConditions = [
          makeStandardFungiblePostCondition(
            ownerStxAddress,
            FungibleConditionCode.Equal,
            ftAmountCV.value,
            createAssetInfo(ftContractAddress, ftContractName, ftAssetName)
          ),
        ];
        break;
      case 'stx':
        const stxAmountCV = uintCV(amountRef.current.value.trim());
        const stxReceiverCV = assetRecipientRef.current.value.trim()
          ? someCV(standardPrincipalCV(assetRecipientRef.current.value.trim()))
          : noneCV();
        functionArgs = [satsCV, btcReceiverCV, stxAmountCV, stxReceiverCV];
        postConditions = [
          makeStandardSTXPostCondition(
            ownerStxAddress,
            FungibleConditionCode.Equal,
            stxAmountCV.value
          ),
        ];
        break;

      default:
        break;
    }
    await doContractCall({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName: 'create-swap',
      functionArgs,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,

      onCancel: () => {
        setLoading(false);
      },
      onFinish: result => {
        setLoading(false);
        setTxId(result.txId);
      },
    });
  };

  const setRecipientAction = async () => {
    setLoading(true);
    const errors = [];
    if (assetRecipientRef.current.value.trim() === '') {
      errors.push('Receiver is required');
    }
    if (errors.length > 0) {
      setLoading(false);
      setStatus(
        errors.map((e, index) => (
          <React.Fragment key={index}>
            {e}
            <br />
          </React.Fragment>
        ))
      );
      return;
    }
    const contract = contracts[type];
    let functionArgs;
    let postConditions;
    let functionName;
    let idCV;
    switch (type) {
      case 'nft':
        setStatus('not supported');
        return;
      case 'ft':
        functionName = 'set-ft-receiver';
        idCV = uintCV(id);
        functionArgs = [idCV];
        postConditions = [];
        break;
      case 'stx':
        functionName = 'set-stx-receiver';
        idCV = uintCV(id);
        functionArgs = [idCV];
        postConditions = [];
        break;

      default:
        break;
    }
    await doContractCall({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName,
      functionArgs,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,

      onCancel: () => {
        setLoading(false);
      },
      onFinish: result => {
        setLoading(false);
        setTxId(result.txId);
      },
    });
  };

  const cancelAction = async () => {
    const contract = contracts[type];
    let functionArgs;
    let postConditions;
    let idCV;
    switch (type) {
      case 'nft':
        const [nftContractAddress, nftTail] = traitRef.current.value.trim().split('.');
        const [nftContractName, nftAssetName] = nftTail.split('::');

        idCV = uintCV(id);
        functionArgs = [idCV];
        postConditions = [
          makeContractNonFungiblePostCondition(
            contract.address,
            contract.name,
            NonFungibleConditionCode.DoesNotOwn,
            createAssetInfo(nftContractAddress, nftContractName, nftAssetName),
            idCV
          ),
        ];

        break;
      case 'ft':
        const [ftContractAddress, ftTail] = traitRef.current.value.trim().split('.');
        const [ftContractName, ftAssetName] = ftTail.split('::');

        idCV = uintCV(id);
        functionArgs = [idCV];
        postConditions = [
          makeContractFungiblePostCondition(
            contract.address,
            contract.name,
            FungibleConditionCode.Equal,
            new BN(formData.amount),
            createAssetInfo(ftContractAddress, ftContractName, ftAssetName)
          ),
        ];
        break;
      case 'stx':
        idCV = uintCV(id);
        functionArgs = [idCV];
        postConditions = [
          makeContractSTXPostCondition(
            contract.address,
            contract.name,
            FungibleConditionCode.Equal,
            new BN(formData.amount)
          ),
        ];
        break;

      default:
        break;
    }
    await doContractCall({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName: 'cancel',
      functionArgs,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      postConditions,

      onCancel: () => {
        setLoading(false);
      },
      onFinish: result => {
        setLoading(false);
        setTxId(result.txId);
      },
    });
  };

  const asset = getAsset(type, formData.trait);
  const assetName = getAssetName(type, formData.trait);
  return (
    <>
      <h3>Create Swap BTC-{asset}</h3>
      {type === 'nft' && (
        <p>For a swap of Bitcoins and an NFT on Stacks, the NFT has to comply with SIP-9.</p>
      )}
      {type === 'ft' && (
        <p>For a swap of Bitcoins and a token on Stacks, the token has to comply with SIP-10.</p>
      )}
      <p>
        Your {assetName} {type === 'nft' ? ' is ' : ' are '} sent to the contract now and will be
        released to the buyer if the BTC transaction is verified (or back to you if the swap expired
        after 100 Bitcoin blocks and you called "cancel").
      </p>
      <form>
        <div className={`input-group ${type === 'stx' ? 'd-none' : ''}`}>
          <input
            type="text"
            className="form-control"
            ref={traitRef}
            value={formData.trait}
            onChange={e => setFormData({ ...formData, trait: e.current.value })}
            aria-label={`fully qualified contract of the ${assetName} and its asset class`}
            placeholder={`fully qualified contract of the ${assetName} and its asset class`}
            readOnly={trait}
            required
            minLength="1"
          />
        </div>
        <div className="container">
          <div className="row align-items-center m-5">
            <div className="col text-center">
              {!id || formData.assetSenderFromSwap === ownerStxAddress ? (
                <>
                  Seller (You)
                  <br />
                  <Address addr={ownerStxAddress} />
                </>
              ) : (
                <>
                  Seller
                  <br />
                </>
              )}

              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  ref={btcRecipientRef}
                  value={formData.btcRecipient}
                  onChange={e => setFormData({ ...formData, btcRecipient: e.target.value })}
                  aria-label="Bitcoin recipient address (must start with 1)"
                  placeholder="Bitcoin recipient address (must start with 1)"
                  readOnly={id}
                  required
                  max="40"
                  minLength="1"
                />
              </div>
            </div>
            <div className="col text-center border-left">
              <AssetIcon type={type} trait={formData.trait} />
              <br />
              <div className={`input-group ${type === 'nft' ? '' : 'd-none'}`}>
                <input
                  type="number"
                  className="form-control"
                  ref={nftIdRef}
                  value={formData.nftId}
                  onChange={e => setFormData({ ...formData, nftId: e.target.value })}
                  aria-label="ID of NFT"
                  placeholder="ID of NFT"
                  readOnly={id}
                  required
                  minLength="1"
                />
              </div>
              <div className={`input-group ${type === 'nft' ? 'd-none' : ''}`}>
                <input
                  type="number"
                  className="form-control"
                  ref={amountRef}
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  aria-label={`amount of ${assetName} in ${
                    type === 'stx' ? 'ustx' : 'smallest unit'
                  }`}
                  placeholder={`amount of ${assetName} in ${
                    type === 'stx' ? 'ustx' : 'smallest unit'
                  }`}
                  readOnly={id}
                  required
                  minLength="1"
                />
              </div>
              <i className="bi bi-arrow-right"></i>
              <br />
              <i className="bi bi-arrow-left"></i>
              <br />
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  ref={amountSatsRef}
                  value={formData.amountSats}
                  onChange={e => setFormData({ ...formData, amountSats: e.target.value })}
                  aria-label={type === 'nft' ? `Price for NFT in Bitcoin` : `amount of Bitcoins`}
                  placeholder={type === 'nft' ? `Price for NFT in Bitcoin` : `amount of Bitcoins`}
                  readOnly={id}
                  required
                  minLength="1"
                />
              </div>
              <img className="m-1" src="/bitcoin.webp" alt="BTC" />
            </div>
            <div className="col text-center">
              <br />
              Buyer
              <br />
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  ref={assetRecipientRef}
                  value={formData.assetRecipient}
                  onChange={e => setFormData({ ...formData, assetRecipient: e.target.value })}
                  aria-label={`${assetName} receiver's Stacks address`}
                  placeholder={`${assetName} receiver's Stacks address`}
                  readOnly={id && formData.assetRecipientFromSwap}
                  required
                  minLength="1"
                />
              </div>
            </div>
          </div>
          {status && (
            <div className="row align-items-center">
              <div className="col text-center alert">{status}</div>
            </div>
          )}
          <div className="row">
            <div className="col-12 text-center">
              {id &&
                formData.assetSenderFromSwap &&
                formData.whenFromSwap + 100 < blockHeight &&
                formData.doneFromSwap === 0 && (
                  <button
                    className="btn btn-block btn-primary"
                    type="button"
                    onClick={cancelAction}
                  >
                    <div
                      role="status"
                      className={`${
                        loading ? '' : 'd-none'
                      } spinner-border spinner-border-sm text-info align-text-top mr-2`}
                    />
                    Cancel swap
                  </button>
                )}
              {id ? (
                formData.assetRecipientFromSwap ? (
                  <></>
                ) : (
                  <button
                    className="btn btn-block btn-primary"
                    type="button"
                    onClick={setRecipientAction}
                  >
                    <div
                      role="status"
                      className={`${
                        loading ? '' : 'd-none'
                      } spinner-border spinner-border-sm text-info align-text-top mr-2`}
                    />
                    Buy {assetName}
                  </button>
                )
              ) : (
                <button className="btn btn-block btn-primary" type="button" onClick={createAction}>
                  <div
                    role="status"
                    className={`${
                      loading ? '' : 'd-none'
                    } spinner-border spinner-border-sm text-info align-text-top mr-2`}
                  />
                  Sell {asset}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
      {txId && <TxStatus txId={txId} />}
    </>
  );
}
