/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import randomWords from 'random-words';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { WordsWrapper } from '../lib/contracts/WordsWrapper';
import { CONFIG } from '../config';
import * as CompiledContractArtifact from '../../build/contracts/ERC20.json';
import { CKETH_CONTRACT_ADDRESS, SUDT_CONTRACT_ADDRESS, FORCE_BRIDGE_URL } from './vars';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

interface IWord {
    id: number;
    owner: string;
    word: string;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<WordsWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);

    const [words, setWords] = useState<IWord[]>();
    const [selectedWord, setSelectedWord] = useState<string>();
    const [randomGeneratedWords, setRandomGeneratedWords] = useState<string[]>();
    const [loading, setLoading] = useState<boolean>();
    const [ckethBalance, setCkethBalance] = useState<string>();
    const [depositAddress, setDepositAddress] = useState<string>();
    const [sudtBalance, setSudtBalance] = useState<string>();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (contract && polyjuiceAddress) {
            refreshAllUserBalances();
        }
    }, [contract, polyjuiceAddress]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];

    const modifyCketh = (number: string, ndecimals: number) => {
        if (number.length > ndecimals) {
            return `${number.substring(0, number.length - ndecimals)}.${number
                .substring(number.length - ndecimals)
                .replace(/0+/, '')}`;
        }
        const nzeros = ndecimals - number.length;
        const newnumber = `0.${String('0').repeat(nzeros)}${number.replace(/0+/, '')}`;
        return newnumber;
    };

    const changeCkethBalance = async () => {
        const _contractCketh = new web3.eth.Contract(
            CompiledContractArtifact.abi as any,
            CKETH_CONTRACT_ADDRESS
        );

        const _balanceCketh = await _contractCketh.methods.balanceOf(polyjuiceAddress).call({
            from: accounts?.[0]
        });

        setCkethBalance(_balanceCketh);
    };

    const changeCkbBalance = async () => {
        const _l2Balance = BigInt(await web3.eth.getBalance(accounts?.[0]));
        setL2Balance(_l2Balance);
    };

    const changeSudtBalance = async () => {
        const _contractSudt = new web3.eth.Contract(
            CompiledContractArtifact.abi as any,
            SUDT_CONTRACT_ADDRESS
        );

        const _balanceSudt = await _contractSudt.methods.balanceOf(polyjuiceAddress).call({
            from: accounts?.[0]
        });

        setSudtBalance(_balanceSudt);
    };

    const getLayer2DepositAddress = async () => {
        const addressTranslator = new AddressTranslator();

        const _depositAddress = await addressTranslator.getLayer2DepositAddress(
            web3,
            accounts?.[0]
        );
        setDepositAddress(_depositAddress.addressString);
    };

    const generateWords = () => {
        setRandomGeneratedWords(randomWords(5));
    };

    // async function deployContract() {
    //     try {
    //         setDeployTxHash(undefined);
    //         setTransactionInProgress(true);

    //         const transactionHash = await _contract.deploy(account);

    //         setDeployTxHash(transactionHash);
    //         setExistingContractAddress(_contract.address);
    //         toast(
    //             'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
    //             { type: 'success' }
    //         );
    //     } catch (error) {
    //         console.error(error);
    //         toast.error(
    //             'There was an error sending your transaction. Please check developer console.'
    //         );
    //     } finally {
    //         setTransactionInProgress(false);
    //     }
    // }

    async function getAllWords() {
        setLoading(true);
        const total = await contract.getTotalWord(account);

        const _words = [];
        for (let k = 1; k <= total; k++) {
            const _newWord = await contract.getUserWord(k, account);
            _words.push(_newWord);
        }
        setWords(_words);
        setLoading(false);
        toast('Successfully read all the words stored on Nervos Network.', { type: 'success' });
    }

    // async function setExistingContractAddress(contractAddress: string) {
    //     const _contract = new WordsWrapper(web3);
    //     _contract.useDeployed(contractAddress.trim());

    //     setContract(_contract);
    // }

    async function newWord(e: any) {
        console.log(e.target.id);
        try {
            setTransactionInProgress(true);
            await contract.assignWord(e.target.id, account);
            toast('Successfully set new word to a user.', { type: 'success' });
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });
            const _contract = new WordsWrapper(_web3);
            setContract(_contract);

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });
    const refreshAllUserBalances = async () => {
        setCkethBalance(undefined);
        setSudtBalance(undefined);
        setL2Balance(undefined);
        await changeCkethBalance();
        await changeSudtBalance();
        await changeCkbBalance();
    };

    const goToFb = () => {
        window.open(FORCE_BRIDGE_URL, '_blank');
    };

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div className={'app'}>
            <h1>Random Blockchain Words</h1>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br />
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            <br />
            ckEth balance:{' '}
            <b>
                {ckethBalance ? modifyCketh(ckethBalance.toString(), 18) : <LoadingIndicator />}{' '}
                ckETH
            </b>
            <br />
            <br />
            <br />
            SUDT balance: <b>{sudtBalance ? (sudtBalance as string) : <LoadingIndicator />}</b>
            <br />
            <br />
            <button onClick={refreshAllUserBalances} style={{ marginLeft: '40%' }}>
                {' '}
                Refresh Balance
            </button>
            <br />
            <br />
            <hr />
            <div>
                <button onClick={getLayer2DepositAddress}>
                    Manage Layer2 Deposit via Force Bridge
                </button>
                <br />
                <br />
                {depositAddress && (
                    <div>
                        {' '}
                        <p className="address">{depositAddress}</p>
                        <br />
                        <br />
                        <p> Deposit via Force Bridge</p>
                        <br />
                        <br />
                        <button onClick={goToFb}>Force Bridge</button>
                    </div>
                )}
                <hr />
            </div>
            <br />
            <br />
            <hr />
            <div>
                <button onClick={generateWords}>Generate Random Words</button>
                <br />
                <br />
                {randomGeneratedWords?.map(word => (
                    <div
                        title={'Choose as my word'}
                        className={'random-word'}
                        key={word}
                        id={word}
                        onClick={e => newWord(e)}
                    >
                        {word}{' '}
                    </div>
                ))}
            </div>
            <br />
            <br />
            <br />
            <div>
                <button onClick={getAllWords}>Get User Words</button>
                <br />
                <br />
                {loading && <LoadingIndicator />}
                {words?.map(userWord => (
                    <div key={userWord.id} className={'random-word2'}>
                        <span style={{ marginRight: '200px' }}>
                            <small>
                                <b>Owner:</b>
                            </small>{' '}
                            {userWord.owner}
                        </span>

                        <span>
                            <small>
                                <b>Word:</b>
                            </small>{' '}
                            {userWord.word}
                        </span>
                    </div>
                ))}
            </div>
            <ToastContainer />
        </div>
    );
}
