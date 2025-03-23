// CardManager 클래스 정의 - 카드 관리 기능을 정적 메서드로 제공
class CardManager {
  // 정적 변수들
  static isDragging = false
  static CONTAINER_ID = 'hs-chzzk-cards-container-main'
  static ENEMY_CONTAINER_ID = 'hs-chzzk-enemy-cards-container-main'
  static streamerListUrl = 'https://hs-chzzk-deck-tracker-server.vercel.app/api/streamerList'
  static baseUrl = 'https://hs-chzzk-deck-tracker-server.vercel.app/api/deckTrace'
  static playerCardList = []
  static enemyCardList = []
  static currentPlayerCardList = []
  static currentEnemyCardList = []
  static currentStreamerId = ''
  static streamerList = []
  static autoFetcherId = null
  static isBigCard = false // 카드 크기 상태 추가
  // HTML 템플릿 - 컨테이너 구조 정의
  static CONTAINER_TEMPLATE = `
    <div id="hs-chzzk-cards-container-main" class="hs-chzzk-card-container">
      <div class="hs-chzzk-drag-handle">
        <span>≡ 내 카드 목록</span>
        <button class="hs-chzzk-close-button">×</button>
      </div>
      <div class="hs-chzzk-cards-wrapper"></div>
      <div class="hs-chzzk-resize-handle"></div>
      <div class="hs-chzzk-resize-handle-horizontal"></div>
    </div>
  `

  // 적 카드 컨테이너 템플릿
  static ENEMY_CONTAINER_TEMPLATE = `
    <div id="hs-chzzk-enemy-cards-container-main" class="hs-chzzk-card-container hs-chzzk-enemy-container">
      <div class="hs-chzzk-drag-handle">
        <span>≡ 상대방 카드 목록</span>
        <button class="hs-chzzk-close-button">×</button>
      </div>
      <div class="hs-chzzk-cards-wrapper"></div>
      <div class="hs-chzzk-resize-handle"></div>
      <div class="hs-chzzk-resize-handle-horizontal"></div>
    </div>
  `

  // 초기화 함수 - 스타일 적용 및 이벤트 설정
  static async initialize() {
    // 스타일 추가
    if (!document.getElementById('card-manager-styles')) {
      const linkElement = document.createElement('link')
      linkElement.id = 'card-manager-styles'
      linkElement.rel = 'stylesheet'
      linkElement.href = 'styles.css'
      document.head.appendChild(linkElement)
    }

    // 스트리머 목록 가져오기
    this.streamerList = await this.getStreamerList()
    this.currentStreamerId = window.location.pathname.split('/').pop()

    if (this.checkStreamerList(this.currentStreamerId) && this.checkCategory()) {
      this.displayPlayerCards()
      this.displayEnemyCards()
      this.startDataFetching()
    }

    // URL 변경 감지를 위한 MutationObserver 설정
    this.setupUrlAndCategoryChangeDetection()

    // 카드 크기 상태 로드
    this.isBigCard = this.loadCardSizeState()
  }

  // 컨테이너 투명도 설정 함수
  static setContainerOpacity(containerId, opacity) {
    const container = document.getElementById(containerId)
    if (container) {
      container.style.opacity = opacity
      this.saveContainerOpacity(containerId, opacity)
    }
  }

  // 컨테이너 투명도 저장 함수
  static saveContainerOpacity(containerId, opacity) {
    try {
      const opacitySettings = JSON.parse(localStorage.getItem('containerOpacity')) || {}
      opacitySettings[containerId] = opacity
      localStorage.setItem('containerOpacity', JSON.stringify(opacitySettings))
      console.log(`컨테이너 투명도 설정 저장됨: ${containerId}`, opacity)
    } catch (error) {
      console.error('투명도 설정 저장 중 오류 발생:', error)
    }
  }

  // 컨테이너 투명도 로드 함수
  static getContainerOpacity(containerId) {
    try {
      const opacitySettings = JSON.parse(localStorage.getItem('containerOpacity')) || {}
      return opacitySettings[containerId] !== undefined ? opacitySettings[containerId] : 1
    } catch (error) {
      console.error('투명도 설정 로드 중 오류 발생:', error)
      return 1
    }
  }

  static checkCategory() {
    const aList = document.querySelectorAll('a')
    const hearthCategory = Array.from(aList).find(a => a.href.includes('/category/GAME/Hearthstone/lives'))
    if (hearthCategory) return true
    return false
  }

  // URL 변경 감지 설정
  static setupUrlAndCategoryChangeDetection() {
    // 이전 URL 저장
    let lastUrl = location.href
    let isCategoryChecked = this.checkCategory()

    // URL 변경 확인 함수
    const checkForUrlAndCategoryChange = () => {
      if (lastUrl !== location.href || isCategoryChecked !== this.checkCategory()) {
        lastUrl = location.href
        isCategoryChecked = this.checkCategory()
        this.handleUrlAndCategoryChange()
      }
    }

    // 주기적으로 URL 변경 확인
    setInterval(checkForUrlAndCategoryChange, 1000)
  }

  // URL 변경 처리 함수
  static async handleUrlAndCategoryChange() {
    const newStreamerId = window.location.pathname.split('/').pop()

    // streamerId가 변경된 경우에만 처리
    if (this.currentStreamerId !== newStreamerId || this.checkCategory()) {
      this.currentStreamerId = newStreamerId

      // streamerList가 비어있으면 다시 가져오기
      if (this.streamerList.length === 0) {
        this.streamerList = await this.getStreamerList()
      }

      // 지원되는 스트리머인지 확인
      if (this.checkStreamerList(newStreamerId)) {
        // 지원되는 스트리머이고 카테고리가 하스스톤이면 카드 표시
        this.displayPlayerCards()
        this.displayEnemyCards()
        this.startDataFetching()
      } else {
        // 지원되지 않는 스트리머거나 카테고리가 하스스톤이 아니면 카드 컨테이너 제거
        this.removeCardContainers()
        this.stopDataFetching()
      }
    }
  }

  // 카드 컨테이너 제거 함수
  static removeCardContainers() {
    const playerContainer = document.getElementById(this.CONTAINER_ID)
    const enemyContainer = document.getElementById(this.ENEMY_CONTAINER_ID)

    if (playerContainer) {
      playerContainer.remove()
    }

    if (enemyContainer) {
      enemyContainer.remove()
    }
  }

  // 스트리머 목록 가져오기
  static async getStreamerList() {
    try {
      const response = await fetch(this.streamerListUrl)
      if (!response.ok) {
        console.error('스트리머 목록 가져오기 중 오류 발생:', response.statusText)
        return []
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('스트리머 목록 가져오기 중 오류 발생:', error)
      return []
    }
  }

  static checkStreamerList(streamerId) {
    if (this.streamerList.length === 0) {
      console.error('스트리머 목록이 없습니다')
      return false
    }
    if (!this.streamerList.map(s => s.streamerId).includes(streamerId)) {
      console.log('하스스톤 덱트래커 지원 스트리머 목록에 없는 스트리머입니다')
      return false
    }
    return true
  }

  // 주기적으로 데이터를 가져오는 함수
  static startDataFetching() {
    // 즉시 첫 번째 데이터 가져오기 실행
    this.updateCardData()

    // 5초마다 반복 실행
    this.autoFetcherId = setInterval(() => {
      this.updateCardData()
    }, 5000)
  }

  static stopDataFetching() {
    if (this.autoFetcherId) {
      clearInterval(this.autoFetcherId)
      this.autoFetcherId = null
    }
  }

  // 카드 데이터 업데이트 함수
  static async updateCardData() {
    if (!window || !window.location) return
    const pathName = window.location.pathname
    const streamerId = pathName.split('/').pop()
    const url = `${this.baseUrl}/${streamerId}`
    const data = await this.fetchData(url)

    // 에러가 발생하지 않은 경우에만 데이터 업데이트
    if (data !== null) {
      this.playerCardList = data.playerCardList || []
      this.enemyCardList = data.enemyCardList || []

      // 화면 갱신
      this.displayPlayerCards()
      this.displayEnemyCards()
    }
  }

  // 설정 저장 함수
  static saveContainerSettings(containerId, settings) {
    try {
      const allSettings = JSON.parse(localStorage.getItem('cardContainerSettings')) || {}
      allSettings[containerId] = settings
      localStorage.setItem('cardContainerSettings', JSON.stringify(allSettings))
      console.log(`컨테이너 설정 저장됨: ${containerId}`, settings)
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error)
    }
  }

  // 설정 불러오기 함수
  static loadContainerSettings(containerId) {
    try {
      const allSettings = JSON.parse(localStorage.getItem('cardContainerSettings')) || {}
      return allSettings[containerId] || null
    } catch (error) {
      console.error('설정 불러오기 중 오류 발생:', error)
      return null
    }
  }

  // 컨테이너 표시/숨김 토글 함수
  static toggleContainer(containerId) {
    const container = document.getElementById(containerId)
    if (container) {
      if (container.style.display === 'none') {
        container.style.display = 'block'
        this.saveVisibilityState(containerId, true)
      } else {
        container.style.display = 'none'
        this.saveVisibilityState(containerId, false)
      }
    } else {
      // 컨테이너가 없으면 표시
      if (containerId === this.CONTAINER_ID) {
        this.displayPlayerCards()
      } else if (containerId === this.ENEMY_CONTAINER_ID) {
        this.displayEnemyCards()
      }
      this.saveVisibilityState(containerId, true)
    }
  }

  // 가시성 상태 저장
  static saveVisibilityState(containerId, isVisible) {
    try {
      const visibilityStates = JSON.parse(localStorage.getItem('containerVisibility')) || {}
      visibilityStates[containerId] = isVisible
      localStorage.setItem('containerVisibility', JSON.stringify(visibilityStates))
    } catch (error) {
      console.error('가시성 상태 저장 중 오류 발생:', error)
    }
  }

  // 가시성 상태 로드
  static loadVisibilityState(containerId) {
    try {
      const visibilityStates = JSON.parse(localStorage.getItem('containerVisibility')) || {}
      return visibilityStates[containerId] !== undefined ? visibilityStates[containerId] : true
    } catch (error) {
      console.error('가시성 상태 로드 중 오류 발생:', error)
      return true
    }
  }

  // 데이터 가져오기 함수
  static async fetchData(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('네트워크 응답이 정상이 아닙니다')
      }
      const data = await response.json()
      const { playerCardList, enemyCardList } = data
      return { playerCardList, enemyCardList }
    } catch (error) {
      console.log('데이터를 가져오는 중 오류 발생:', error)
      return null
    }
  }

  // 카드 표시 통합 함수
  static displayCardList(newCards, currentCards, containerId, containerTemplate) {
    // Map에서 배열로 변환

    // 컨테이너 생성 또는 가져오기
    let container = document.getElementById(containerId)

    if (!container) {
      // 컨테이너가 없으면 템플릿으로 생성
      const template = document.createElement('template')
      template.innerHTML = containerTemplate.trim()
      container = template.content.firstChild

      // 저장된 설정 불러오기
      const savedSettings = this.loadContainerSettings(containerId)
      if (savedSettings) {
        if (savedSettings.top) container.style.top = savedSettings.top
        if (savedSettings.left) container.style.left = savedSettings.left
        if (savedSettings.height) container.style.height = savedSettings.height
        if (savedSettings.width) container.style.width = savedSettings.width
      }

      // 문서에 컨테이너 추가
      document.body.appendChild(container)

      // 드래그 및 리사이즈 이벤트 설정
      const dragHandle = container.querySelector('.hs-chzzk-drag-handle')
      const resizeHandle = container.querySelector('.hs-chzzk-resize-handle')
      const resizeHandleHorizontal = container.querySelector('.hs-chzzk-resize-handle-horizontal')
      const closeButton = container.querySelector('.hs-chzzk-close-button')

      this.makeDraggableContainer(container, dragHandle, containerId)
      this.makeResizable(container, resizeHandle, containerId)

      // 가로 리사이즈는 플레이어 컨테이너일 경우에만 적용
      if (containerId === this.CONTAINER_ID && resizeHandleHorizontal) {
        this.makeHorizontalResizable(container, resizeHandleHorizontal, containerId)
      }

      // 닫기 버튼 이벤트 설정
      closeButton.addEventListener('click', () => {
        this.toggleContainer(containerId)
      })
    }

    // 가시성 상태 확인 및 적용
    const isVisible = this.loadVisibilityState(containerId)
    container.style.display = isVisible ? 'block' : 'none'

    // 투명도 적용
    const opacity = this.getContainerOpacity(containerId)
    container.style.opacity = opacity

    // 카드 컨테이너 가져오기
    let cardsWrapper = container.querySelector('.hs-chzzk-cards-wrapper')
    const isNewGameStarted = newCards.length < currentCards.length
    if (isNewGameStarted) {
      cardsWrapper.innerHTML = ''
    }

    // 현재 표시된 카드 이름 목록 생성
    const currentCardNames = Array.from(currentCards).map(card => card.name)

    // 새로운 카드만 필터링
    const newCardsToAdd = isNewGameStarted ? newCards : newCards.filter(card => !currentCardNames.includes(card.name))

    // 새로운 카드가 있을 경우에만 추가
    newCardsToAdd.forEach(card => {
      const cardElement = document.createElement('div')
      cardElement.className = 'hs-chzzk-card-element'
      cardElement.style.backgroundImage = `url(${card.thumbnail || ''})`
      cardElement.dataset.cardName = card.name // 카드 이름 데이터 속성 추가

      // 카드 이름 표시
      const nameElement = document.createElement('div')
      nameElement.className = 'hs-chzzk-card-name'
      nameElement.textContent = card.count > 1 ? `${card.name} (${card.count})` : card.name

      // 마우스 호버 시 전체 이미지 표시
      const fullImageElement = document.createElement('div')
      fullImageElement.className = 'hs-chzzk-full-image'
      fullImageElement.style.backgroundImage = `url(${card.image})`

      cardElement.appendChild(nameElement)
      cardElement.appendChild(fullImageElement)

      // 비용 표시
      if (card.cost !== undefined) {
        const costElement = document.createElement('div')
        costElement.className = 'hs-chzzk-card-cost'
        costElement.textContent = card.cost
        cardElement.appendChild(costElement)
      }

      // 호버 이벤트 추가
      cardElement.addEventListener('mouseenter', event => {
        fullImageElement.style.display = 'block'
      })

      cardElement.addEventListener('mouseleave', () => {
        fullImageElement.style.display = 'none'
      })

      cardsWrapper.appendChild(cardElement)
    })

    // 현재 카드 목록 업데이트
    if (containerId === this.CONTAINER_ID) {
      this.currentPlayerCardList = Array.from(newCards)
    } else if (containerId === this.ENEMY_CONTAINER_ID) {
      this.currentEnemyCardList = Array.from(newCards)
    }

    // 저장된 카드 크기 상태 적용
    if (this.isBigCard) {
      container.classList.add('hs-chzzk-big-cards')
    }
  }

  // 카드 표시 함수
  static displayPlayerCards() {
    // 통합 함수 호출
    this.displayCardList(this.playerCardList, this.currentPlayerCardList, this.CONTAINER_ID, this.CONTAINER_TEMPLATE)
  }

  // 적 카드 표시 함수
  static displayEnemyCards() {
    // 통합 함수 호출
    this.displayCardList(
      this.enemyCardList,
      this.currentEnemyCardList,
      this.ENEMY_CONTAINER_ID,
      this.ENEMY_CONTAINER_TEMPLATE,
    )
  }

  // 컨테이너를 드래그 가능하게 만드는 함수
  static makeDraggableContainer(element, handleElement, containerId) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0

    if (handleElement) {
      handleElement.addEventListener('mousedown', dragMouseDown)
    } else {
      element.addEventListener('mousedown', dragMouseDown)
    }

    function dragMouseDown(e) {
      e.preventDefault()
      pos3 = e.clientX
      pos4 = e.clientY

      document.addEventListener('mousemove', elementDrag)
      document.addEventListener('mouseup', closeDragElement)
    }

    function elementDrag(e) {
      e.preventDefault()

      pos1 = pos3 - e.clientX
      pos2 = pos4 - e.clientY
      pos3 = e.clientX
      pos4 = e.clientY

      element.style.top = element.offsetTop - pos2 + 'px'
      element.style.left = element.offsetLeft - pos1 + 'px'
    }

    function closeDragElement() {
      document.removeEventListener('mousemove', elementDrag)
      document.removeEventListener('mouseup', closeDragElement)

      element.style.top = element.style.top < '1x' ? '1px' : element.style.top

      // 드래그 완료 후 설정 저장
      if (containerId) {
        CardManager.saveContainerSettings(containerId, {
          top: element.style.top < '1px' ? '1px' : element.style.top,
          left: element.style.left,
          height: element.style.height,
        })
      }
    }
  }

  // 요소의 높이를 조절 가능하게 만드는 함수
  static makeResizable(element, resizeHandle, containerId) {
    let startY, startHeight

    resizeHandle.addEventListener('mousedown', function (e) {
      e.preventDefault()
      e.stopPropagation() // 이벤트 버블링 방지
      CardManager.isDragging = true // 드래그 상태 표시
      startY = e.clientY
      startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10)

      document.addEventListener('mousemove', resizeElement)
      document.addEventListener('mouseup', stopResize)
    })

    function resizeElement(e) {
      if (!CardManager.isDragging) return
      e.preventDefault()
      e.stopPropagation() // 이벤트 버블링 방지
      const maxHeight = window.innerHeight * 0.95
      let newHeight = Math.max(100, startHeight + e.clientY - startY)
      newHeight = Math.min(newHeight, maxHeight)

      element.style.height = newHeight + 'px'
      // 컨텐츠 영역 크기 조정
      const cardsWrapper = element.querySelector('.hs-chzzk-cards-wrapper')
      if (cardsWrapper) {
        cardsWrapper.style.height = newHeight - 30 + 'px' // 드래그 핸들과 리사이즈 핸들 높이 고려
      }
    }

    function stopResize(e) {
      if (e) {
        e.preventDefault()
        e.stopPropagation() // 이벤트 버블링 방지
      }
      CardManager.isDragging = false // 드래그 상태 해제
      document.removeEventListener('mousemove', resizeElement)
      document.removeEventListener('mouseup', stopResize)

      // 리사이즈 완료 후 설정 저장
      if (containerId) {
        CardManager.saveContainerSettings(containerId, {
          top: element.style.top < '10px' ? '10px' : element.style.top,
          left: element.style.left,
          height: element.style.height,
          width: element.style.width,
        })
      }
    }
    resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }

  // 요소의 가로 크기를 조절 가능하게 만드는 함수
  static makeHorizontalResizable(element, resizeHandle, containerId) {
    let startX, startWidth

    resizeHandle.addEventListener('mousedown', function (e) {
      e.preventDefault()
      e.stopPropagation() // 이벤트 버블링 방지
      CardManager.isDragging = true // 드래그 상태 표시
      startX = e.clientX
      startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10)

      document.addEventListener('mousemove', resizeElement)
      document.addEventListener('mouseup', stopResize)
    })

    function resizeElement(e) {
      if (!CardManager.isDragging) return
      e.preventDefault()
      e.stopPropagation() // 이벤트 버블링 방지
      const maxWidth = window.innerWidth * 0.95

      // 플레이어 컨테이너는 오른쪽으로 드래그하면 커지고, 왼쪽으로 드래그하면 작아짐
      let newWidth = Math.max(100, startWidth + (e.clientX - startX))
      newWidth = Math.min(newWidth, maxWidth)
      element.style.width = newWidth + 'px'
      const enemyContainer = document.getElementById(CardManager.ENEMY_CONTAINER_ID)
      if (enemyContainer) enemyContainer.style.width = element.style.width

      // 컨텐츠 영역 크기 조정
      const cardsWrapper = element.querySelector('.hs-chzzk-cards-wrapper')
      if (cardsWrapper) {
        cardsWrapper.style.width = '100%' // 부모 요소에 맞게 너비 설정
      }
    }

    function stopResize(e) {
      if (e) {
        e.preventDefault()
        e.stopPropagation() // 이벤트 버블링 방지
      }
      CardManager.isDragging = false // 드래그 상태 해제
      document.removeEventListener('mousemove', resizeElement)
      document.removeEventListener('mouseup', stopResize)

      // 리사이즈 완료 후 설정 저장
      if (containerId) {
        CardManager.saveContainerSettings(containerId, {
          top: element.style.top,
          left: element.style.left,
          height: element.style.height,
          width: element.style.width,
        })
        const enemyContainer = document.getElementById(CardManager.ENEMY_CONTAINER_ID)
        if (enemyContainer) {
          CardManager.saveContainerSettings(CardManager.ENEMY_CONTAINER_ID, {
            left: enemyContainer.style.left,
            width: element.style.width,
            height: enemyContainer.style.height,
            top: enemyContainer.style.top,
          })
        }
      }
    }
    resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }

  // 카드 크기 토글 함수
  static toggleCardSize() {
    this.isBigCard = !this.isBigCard
    this.saveCardSizeState(this.isBigCard)

    // 플레이어 카드 컨테이너
    const playerContainer = document.getElementById(this.CONTAINER_ID)
    if (playerContainer) {
      if (this.isBigCard) {
        playerContainer.classList.add('hs-chzzk-big-cards')
      } else {
        playerContainer.classList.remove('hs-chzzk-big-cards')
      }
    }

    // 적 카드 컨테이너
    const enemyContainer = document.getElementById(this.ENEMY_CONTAINER_ID)
    if (enemyContainer) {
      if (this.isBigCard) {
        enemyContainer.classList.add('hs-chzzk-big-cards')
      } else {
        enemyContainer.classList.remove('hs-chzzk-big-cards')
      }
    }
  }

  // 카드 크기 상태 저장
  static saveCardSizeState(isSmall) {
    try {
      localStorage.setItem('cardSizeState', JSON.stringify(isSmall))
    } catch (error) {
      console.error('카드 크기 상태 저장 중 오류 발생:', error)
    }
  }

  // 카드 크기 상태 로드
  static loadCardSizeState() {
    try {
      const savedState = localStorage.getItem('cardSizeState')
      return savedState ? JSON.parse(savedState) : false
    } catch (error) {
      console.error('카드 크기 상태 로드 중 오류 발생:', error)
      return false
    }
  }
}

// 클래스 초기화
window.onload = CardManager.initialize.bind(CardManager)
