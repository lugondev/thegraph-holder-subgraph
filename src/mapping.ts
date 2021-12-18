import {Address, BigInt, log} from "@graphprotocol/graph-ts"

import {NFT, Transfer} from "../generated/NFT/NFT"
import {Holder, Info, Token, Transfer as TransferEvent} from "../generated/schema"

function getHolder(address: string): Holder {
    let holder = Holder.load(address)
    if (!holder) {
        return new Holder(address)
    }
    return holder
}

function getToken(tokenId: BigInt): Token {
    let token = Token.load(tokenId.toString())
    if (!token) {
        return new Token(tokenId.toString())
    }
    return token
}

function updateInfo(address: Address): void {
    const nft_info_id = "NFT"
    let nftInfo = Info.load(nft_info_id)
    if (!nftInfo) {
        nftInfo = new Info(nft_info_id)
        nftInfo.txns = BigInt.zero()
    }

    let contract = NFT.bind(address)
    nftInfo.totalSupply = contract.totalSupply()
    nftInfo.txns = nftInfo.txns.plus(BigInt.fromI32(1))
    nftInfo.save()
}

export function handleTransferTemplate(event: Transfer): void {

    log.debug("handle transfer template: from {} to {} id {}", [
        event.params.from.toHexString(),
        event.params.to.toHexString(),
        event.params.tokenId.toHexString(),
    ])

    handleTransfer(event)
}

export function handleTransfer(event: Transfer): void {
    updateInfo(event.address)

    if (event.params.from != Address.zero()) {
        let from = getHolder(event.params.from.toHex())
        from.sentCount = from.sentCount + 1
        from.balance = from.balance - 1
        from.save()
    }

    let to = getHolder(event.params.to.toHex())
    to.receivedCount = to.receivedCount + 1
    to.balance = to.balance + 1
    to.save()

    let transfer = new TransferEvent(event.transaction.hash.toHex())
    transfer.from = event.params.from
    transfer.to = event.params.to
    transfer.tokenId = event.params.tokenId
    transfer.timestamp = event.block.timestamp
    transfer.save()

    let token = getToken(event.params.tokenId)
    token.owner = event.params.to.toHex()
    token.updatedAt = event.block.timestamp
    token.latestTx = event.transaction.hash
    token.transfersCount = token.transfersCount.plus(BigInt.fromI32(1))
    token.save()
}
