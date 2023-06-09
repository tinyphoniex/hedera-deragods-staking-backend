const { checkListing, getSoldList, getListingData } = require('../zuseAPI');

const User = require('../../models/User')
const NFTList = require('../../models/NFTList')

exports.getUserInfo = async (req_, res_) => {
    try {
        if (!req_.query.discordName || !req_.query.discriminator || !req_.query.discordId || !req_.query.walletId)
            return res_.send({ result: false, error: 'Invalid post data!' });

        const _discordName = req_.query.discordName
        const _discriminator = req_.query.discriminator
        const _discordId = req_.query.discordId
        const _walletId = req_.query.walletId
        const _nftData = JSON.parse(req_.query.nftData)

        const _isRegistered = await User.findOne({ discord_id: _discordId, discord_name: _discordName + "#" + _discriminator, wallet_id: _walletId })
        if (!_isRegistered) {
            const _newUser = new User({
                discord_id: _discordId,
                discord_name: _discordName + "#" + _discriminator,
                wallet_id: _walletId
            })
            await _newUser.save()
        }

        const _listingData = await getListingData()
        const _soldList = await getSoldList()

        for (let i = 0; i < _nftData.length; i++) {
            let _newFlag = false
            let _stakedNft = await NFTList.findOne({
                token_id: _nftData[i].token_id,
                serial_number: _nftData[i].serial_number,
            })

            if (_stakedNft == null) {
                _stakedNft = new NFTList({
                    token_id: _nftData[i].token_id,
                    serial_number: _nftData[i].serial_number,
                    discord_id: _discordId,
                    discord_name: _discordName + "#" + _discriminator,
                    wallet_id: _walletId,
                    status: "unstaked"
                })
                await _stakedNft.save()
                _newFlag = true
            }

            let _listingStatus = true
            // check zuse listing
            for (let i = 0; i < _listingData.length; i++) {
                if (_listingData[i].nftData.serialNo === parseInt(_stakedNft.serial_number, 10)) {
                    _listingStatus = false;
                }
            }

            if (!_listingStatus) {
                // nft was listed in zuse
                // unstake nft
                await NFTList.findOneAndUpdate(
                    {
                        token_id: _stakedNft.token_id,
                        serial_number: _stakedNft.serial_number,
                    },
                    {
                        point: _stakedNft.point - parseInt((_stakedNft.point / 100) * 15, 10),
                        status: "unstaked",
                        listed: "YES"
                    }
                )
            }
            else {
                // nft is transfered or sold in zuse
                if (_soldList != false) {
                    let soldFlag = false
                    for (let j = 0; j < _soldList.length; j++) {
                        if (_stakedNft.token_id == _soldList[j].nftData.tokenId && parseInt(_stakedNft.serial_number, 10) == _soldList[j].nftData.serialNo) {
                            // nft was sold in zuse
                            await NFTList.findOneAndUpdate(
                                {
                                    token_id: _stakedNft.token_id,
                                    serial_number: _stakedNft.serial_number,
                                },
                                {
                                    discord_id: "",
                                    discord_name: "",
                                    wallet_id: "",
                                    status: "unstaked",
                                    reward: _stakedNft.reward + 500,
                                    listed: "YES",
                                    nft_status: "sold"
                                }
                            )
                            soldFlag = true
                        }
                    }
                    if (soldFlag == false && _newFlag == true) {
                        // nft was transferred to other wallet
                        await NFTList.findOneAndUpdate(
                            {
                                token_id: _stakedNft.token_id,
                                serial_number: _stakedNft.serial_number,
                            },
                            {
                                discord_id: "",
                                discord_name: "",
                                wallet_id: "",
                                status: "unstaked",
                                nft_status: "transferred"
                            }
                        )
                    }
                }
            }
        }

        // get staked nft list
        const _stakedNfts = await NFTList.find({
            discord_id: _discordId,
            discord_name: _discordName + "#" + _discriminator,
            wallet_id: _walletId,
            status: "staked"
        })

        //get total point
        const _totalNftInfo = await NFTList.find({
            discord_id: _discordId,
            discord_name: _discordName + "#" + _discriminator,
            wallet_id: _walletId
        })

        let _totalPoint = 0
        for (let i = 0;i < _totalNftInfo.length;i++)
            _totalPoint = _totalPoint + _totalNftInfo[i].point + _totalNftInfo[i].reward

        return res_.send({ result: true, data: _stakedNfts, totalPoint: _totalPoint, msg: "success" });
    } catch (error) {
        return res_.send({ result: false, error: 'Error detected in server progress!' });
    }
}
