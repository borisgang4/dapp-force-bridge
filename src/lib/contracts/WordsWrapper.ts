import Web3 from 'web3';
import * as WordsJSON from '../../../build/contracts/Words.json';

import { Words } from '../../types/Words';
import { CONTRACT_ADDRESS } from '../../ui/vars';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class WordsWrapper {
    web3: Web3;

    contract: Words;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.address = CONTRACT_ADDRESS;
        this.contract = new web3.eth.Contract(WordsJSON.abi as any) as any;
        this.contract.options.address = CONTRACT_ADDRESS;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getTotalWord(fromAddress: string) {
        const data = await this.contract.methods.total().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async getUserWord(id: number, fromAddress: string) {
        const newWord = await this.contract.methods.idToWord(id).call({ from: fromAddress });

        return { id: Number(newWord.id), owner: newWord.owner, word: newWord.word };
    }

    async assignWord(word: string, fromAddress: string) {
        const tx = await this.contract.methods.assignWord(word).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const tx = this.contract
            .deploy({
                data: WordsJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress
            });

        let transactionHash: string = null;
        tx.on('transactionHash', (hash: string) => {
            transactionHash = hash;
        });

        const contract = await tx;

        this.useDeployed(contract.options.address);

        return transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
