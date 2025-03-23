document.addEventListener('DOMContentLoaded', function () {
  // 모든 카드 창 토글 기능
  document.getElementById('toggleButtons').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: toggleAllCardContainers,
      })
    })
  })

  // 카드 크기 토글 기능
  document.getElementById('toggleCardSize').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: toggleCardSize,
      })
    })
  })

  document.getElementById('resetSettings').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: resetSettings,
      })
    })
  })

  // 통합된 투명도 슬라이더 초기화 및 이벤트 처리
  const opacitySlider = document.getElementById('opacity')
  const opacityValue = document.getElementById('opacityValue')

  // 저장된 투명도 설정 불러오기
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: getContainerOpacity,
        args: ['hs-chzzk-cards-container-main'],
      },
      results => {
        if (results && results[0] && results[0].result !== undefined) {
          const savedOpacity = results[0].result
          opacitySlider.value = savedOpacity * 100
          opacityValue.textContent = `${Math.round(savedOpacity * 100)}%`
        }
      },
    )
  })

  opacitySlider.addEventListener('input', function () {
    const opacityValue = this.value
    document.getElementById('opacityValue').textContent = `${opacityValue}%`

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: setAllContainersOpacity,
        args: [opacityValue / 100],
      })
    })
  })
})

function resetSettings() {
  localStorage.removeItem('cardContainerSettings')
  localStorage.removeItem('containerVisibility')
  localStorage.removeItem('cardSizeState')
  localStorage.removeItem('containerOpacity')
  window.location.reload()
}

// 모든 컨테이너 투명도 설정 함수 (페이지에서 실행)
function setAllContainersOpacity(opacity) {
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return
  }

  // 두 컨테이너 모두 동일한 투명도 적용
  CardManager.setContainerOpacity(CardManager.CONTAINER_ID, opacity)
  CardManager.setContainerOpacity(CardManager.ENEMY_CONTAINER_ID, opacity)
}

// 컨테이너 투명도 설정 함수 (페이지에서 실행)
function setContainerOpacity(containerId, opacity) {
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return
  }

  CardManager.setContainerOpacity(containerId, opacity)
}

// 컨테이너 투명도 가져오기 함수 (페이지에서 실행)
function getContainerOpacity(containerId) {
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return 1
  }

  return CardManager.getContainerOpacity(containerId)
}

// 페이지에서 실행되는 함수 - 모든 카드 창을 동시에 토글
function toggleAllCardContainers() {
  // 카드 매니저 클래스가 존재하는지 확인
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return
  }

  // 현재 컨테이너 상태 확인
  const playerContainer = document.getElementById(CardManager.CONTAINER_ID)
  const enemyContainer = document.getElementById(CardManager.ENEMY_CONTAINER_ID)

  // 두 컨테이너 중 하나라도 표시되어 있으면 둘 다 숨기고, 아니면 둘 다 표시
  const shouldShow =
    !playerContainer ||
    !enemyContainer ||
    playerContainer.style.display === 'none' ||
    enemyContainer.style.display === 'none'

  // 창 상태 토글
  if (shouldShow) {
    // 모든 창 표시
    if (playerContainer && playerContainer.style.display === 'none') {
      CardManager.toggleContainer(CardManager.CONTAINER_ID)
    } else if (!playerContainer) {
      CardManager.displayCards()
      CardManager.saveVisibilityState(CardManager.CONTAINER_ID, true)
    }

    if (enemyContainer && enemyContainer.style.display === 'none') {
      CardManager.toggleContainer(CardManager.ENEMY_CONTAINER_ID)
    } else if (!enemyContainer) {
      CardManager.displayEnemyCards()
      CardManager.saveVisibilityState(CardManager.ENEMY_CONTAINER_ID, true)
    }
  } else {
    // 모든 창 숨기기
    if (playerContainer && playerContainer.style.display !== 'none') {
      CardManager.toggleContainer(CardManager.CONTAINER_ID)
    }

    if (enemyContainer && enemyContainer.style.display !== 'none') {
      CardManager.toggleContainer(CardManager.ENEMY_CONTAINER_ID)
    }
  }
}

// 페이지에서 실행되는 함수 - 카드 크기 토글
function toggleCardSize() {
  // 카드 매니저 클래스가 존재하는지 확인
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return
  }

  // 카드 크기 토글
  CardManager.toggleCardSize()
}
